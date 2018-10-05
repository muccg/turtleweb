import re
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.conf.urls import url
from django.http import HttpResponse

from tastypie import fields
from tastypie import http
from tastypie.resources import ModelResource
from tastypie.utils import trailing_slash
import tastypie.constants

from reversion import revisions
import reversion.models

import hashlib


class RevisionResource(ModelResource):
    user = fields.ForeignKey("kindred.api.users.BriefUserResource", "user",
                             full=True, null=True)

    class Meta:
        queryset = reversion.models.Revision.objects.order_by("-pk")
        ordering = ["-pk"]
        exclude = ["manager_slug"]
        filtering = {
            "date_created": tastypie.constants.ALL,
            "user": tastypie.constants.ALL,
        }


class HashField(fields.ApiField):
    dehydrated_type = 'string'
    help_text = 'Unicode string data. Ex: "Hello World"'

    def convert(self, value):
        if value is None:
            return None

        return hashlib.md5(value.encode("utf-8")).hexdigest()


class VersionResource(ModelResource):
    revision = fields.ForeignKey(RevisionResource, "revision", full=True)
    content_type = fields.ForeignKey("kindred.api.common.ContentTypeResource", "content_type", full=True)
    data = fields.DictField("field_dict", readonly=True, use_in="detail")
    data_hash = HashField("serialized_data", readonly=True, use_in="list")

    class Meta:
        queryset = reversion.models.Version.objects.order_by("-pk")
        excludes = ["serialized_data", "format", "object_repr",
                    "object_id_int"]
        filtering = {
            "revision": tastypie.constants.ALL_WITH_RELATIONS,
            "id": tastypie.constants.ALL,
            "object_id": tastypie.constants.ALL,
            "content_type": tastypie.constants.ALL_WITH_RELATIONS,
        }


class VersionedResourceMixin:
    """
    This resource mixin add a version list resource at a URL beneath
    the object resource.

    The version list appears at /api/v1/resource/ID/versions/.

    The resource at a certain version is contained under the Version
    object id.
    """
    def prepend_urls(self):
        """
        Adds URLs for the version sub-resources.
        """
        urls = [
            url(r"^(?P<resource_name>%s)/(?P<%s>[^/]+)/versions%s$" % (self._meta.resource_name, self._meta.detail_uri_name, trailing_slash()), self.wrap_view('get_version_list'), name="api_get_version_list"),

            url(r"^(?P<resource_name>%s)/(?P<%s>[^/]+)/versions/(?P<version_id>\d+)%s$" % (self._meta.resource_name, self._meta.detail_uri_name, trailing_slash()), self.wrap_view('get_version'), name="api_get_version"),
        ]
        urls.extend(super().prepend_urls())
        return urls

    def remove_api_resource_names(self, url_dict):
        kwargs_subset = super().remove_api_resource_names(url_dict)
        for key in ['version_id']:
            try:
                del(kwargs_subset[key])
            except KeyError:
                pass
        return kwargs_subset

    def _version_checks(self, request, **kwargs):
        """
        Runs the same validation and auth checks as would be run for the
        parent resource get detail view.
        """
        self.method_check(request, allowed=['get'])
        self.is_authenticated(request)
        self.throttle_check(request)
        self.log_throttled_access(request)

        basic_bundle = self.build_bundle(request=request)

        try:
            obj = self.cached_obj_get(bundle=basic_bundle, **self.remove_api_resource_names(kwargs))
        except ObjectDoesNotExist:
            return http.HttpNotFound()
        except MultipleObjectsReturned:
            return http.HttpMultipleChoices("More than one resource is found at this URI.")

        bundle = self.build_bundle(request=request)
        self.authorized_read_detail(self.get_object_list(bundle.request), bundle)
        return obj

    def get_version_list(self, request, **kwargs):
        """
        Gets a list of version resources for the object.
        """
        obj = self._version_checks(request, **kwargs)
        version_resource = VersionResource()
        q = {
            "object_id": str(obj.pk),
            "content_type__model": obj._meta.model_name,
            "content_type__app_label": obj._meta.app_label,
        }
        return version_resource.get_list(request, **q)

    def get_version(self, request, **kwargs):
        """
        Returns the object resource detail with fields as they were at a
        certain version.
        """
        obj = self._version_checks(request, **kwargs)
        q = {
            "object_id": obj.pk,
            "content_type__model": obj._meta.model_name,
            "content_type__app_label": obj._meta.app_label,
            "id": kwargs["version_id"],
        }

        try:
            ver = reversion.models.Version.objects.get(**q)
        except ObjectDoesNotExist:
            return http.HttpNotFound("Version not found")

        vobj = ver.object_version.object

        # fixme: lame attempt to fill in inherited fields when model
        # uses table inheritance
        for f, v in ver.field_dict.items():
            try:
                setattr(vobj, f, v)
            except:
                pass  # lame

        bundle = self.build_bundle(obj=vobj, request=request)
        bundle = self.full_dehydrate(bundle)
        bundle = self.alter_detail_data_to_serialize(request, bundle)
        return self.create_response(request, bundle)

    def put_detail(self, request, **kwargs):
        return self.check_etag(request, **kwargs) or \
            super().put_detail(request, **kwargs)

    def check_etag(self, request, **kwargs):
        basic_bundle = self.build_bundle(request=request)
        try:
            obj = self.cached_obj_get(bundle=basic_bundle, **self.remove_api_resource_names(kwargs))
        except ObjectDoesNotExist:
            return http.HttpNotFound()
        except MultipleObjectsReturned:
            return http.HttpMultipleChoices("More than one resource is found at this URI.")

        # Not a great implementation... but probably good enough to
        # prevent edit conflicts. Compulsory MD5 etags make it
        # difficult to use collections and nested resource.
        slack_etags = True

        if self.can_etag(obj):
            etag_to_match = request.META.get('HTTP_IF_MATCH', '').strip()
            if etag_to_match:
                current_etag = self.calc_etag(request, obj)
                if etag_to_match != current_etag:
                    return HttpPreconditionFailed("Etag mismatch")
            elif not slack_etags:
                return HttpPreconditionRequired("Please use If-Match")

        return None

    def can_etag(self, obj):
        return hasattr(obj, "_meta") and revisions.is_registered(type(obj))

    def calc_etag(self, request, obj):
        latest = revisions.get_for_object(obj).first()
        return str(latest.revision_id) if latest else ""

    def create_response(self, request, data, *args, **response_kwargs):
        response = super().create_response(request, data, *args, **response_kwargs)
        if hasattr(data, "obj") and self.can_etag(data.obj):
            response["etag"] = self.calc_etag(request, data.obj)
        return response


class HttpPreconditionFailed(HttpResponse):
    status_code = 412


class HttpPreconditionRequired(HttpResponse):
    status_code = 428


def monkeypatch_dateparse():
    """
    Due to some slackness in Tastypie, models with date fields get
    datetimes when posted. Reversion will then serialize the date
    fields as datetimes. When it comes to deserializing the old
    version, Django chokes on values it expects to be simple date
    strings. So we just make Django's deserialization less strict.
    """
    import django.utils.dateparse
    django.utils.dateparse.date_re = re.compile(
        r'(?P<year>\d{4})-(?P<month>\d{1,2})-(?P<day>\d{1,2}).*$'
    )

monkeypatch_dateparse()
