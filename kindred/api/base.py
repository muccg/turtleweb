import sys
import logging
import json
import collections

from django.core.urlresolvers import reverse
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.db.models import Q

import tastypie
from tastypie.authorization import DjangoAuthorization, ReadOnlyAuthorization
from tastypie.authentication import SessionAuthentication, Authentication
from tastypie.resources import ModelResource
from tastypie.api import Api
from tastypie.http import HttpNotFound, HttpMultipleChoices
from tastypie import fields

from ..app.models import AccessLog
from ..app.utils import flatten_dict
from .versions import VersionedResourceMixin
from .serialize import BetterSerializer

logger = logging.getLogger(__name__)

__all__ = ["v1", "register", "BaseResource"]

v1 = Api(api_name='v1')


def register(cls, canonical=True):
    "Resource decorator to register it with our v1 api"
    v1.register(cls(), canonical)
    return cls


def make_generic_resource(model_cls, module_name=__name__, paging=True):
    if paging:
        paging_limit = 20
        max_paging_limit = 0
    else:
        paging_limit = 0
        max_paging_limit = 0

    class GenericResource(BaseResource):

        class Meta(BaseResource.Meta):
            queryset = model_cls.objects.all()
            resource_name = model_cls._meta.object_name.lower()
            limit = paging_limit
            max_limit = max_paging_limit
            filtering = {
                "name": tastypie.constants.ALL,
            }

    GenericResource.__name__ = model_cls.__name__ + "Resource"

    resource = GenericResource()
    if resource._meta.resource_name not in v1._canonicals:
        v1.register(resource)
        setattr(sys.modules[module_name], GenericResource.__name__, GenericResource)
    return GenericResource


class BetterAuthentication(SessionAuthentication):
    """
    Normal Django session authentication plus support for custom
    username fields.
    """

    def get_identifier(self, request):
        if request.user.is_authenticated():
            return super(BetterAuthentication, self).get_identifier(request)
        return ""


class BaseResource(VersionedResourceMixin, ModelResource):

    class Meta:
        authorization = DjangoAuthorization()
        authentication = BetterAuthentication()
        serializer = BetterSerializer()
        always_return_data = True
        max_limit = 0

    def get_model(self):
        return self.Meta.queryset.model

    def is_authenticated(self, request):
        """Allows anonymous access to schemas"""
        if request.resolver_match.url_name != "api_get_schema":
            super(BaseResource, self).is_authenticated(request)

    def build_schema(self):
        schema = super(BaseResource, self).build_schema()
        model = self.get_model()
        schema["model"] = {
            "name": model._meta.object_name,
            "verbose_name": model._meta.verbose_name,
            "verbose_name_plural": model._meta.verbose_name_plural,
            "app": model._meta.app_label,
            "str_format": getattr(model, "_str_format", None),
            "str_args": getattr(model, "_str_args", None),
        }
        metafields = dict((f.name, f) for f in model._meta.fields)
        fields = schema["fields"]
        for name, field in fields.items():
            if name in metafields:
                for p in ("verbose_name", "choices", "max_length"):
                    field[p] = getattr(metafields[name], p)
            if field.get("type", None) == "related":
                to = self.fields[name].to_class
                field["related_resource"] = to._meta.resource_name
        fields["resource_uri"]["verbose_name"] = "resource URI"
        return schema

    @classmethod
    def _get_prefix(cls, api_name):
        """
        Caches url reverse of api base and returns it.
        """
        if not hasattr(cls, "_cached_api_prefix"):
            kwargs = {"api_name": api_name}
            name = "api_%s_top_level" % api_name
            cls._cached_api_prefix = reverse(name, kwargs=kwargs)
        return cls._cached_api_prefix

    def _build_reverse_url(self, name, args=None, kwargs=None):
        """
        Django URL reversing is really slow and gets slower the more
        resources you have. This implementation cheats and only calls
        reverse() once per resource.
        """
        prefix = self._get_prefix(kwargs.get("api_name", "v1"))
        if name == "api_dispatch_detail":
            pk = self._meta.detail_uri_name
            return "%s/%s/%s" % (prefix, kwargs["resource_name"], kwargs[pk])
        elif name == "api_dispatch_list":
            return "%s/%s/" % (prefix, kwargs["resource_name"])
        else:
            return super(BaseResource, self)._build_reverse_url(name, args=args, kwargs=kwargs)

    def _get_json_request_data(self, request):
        """
        This is a helper method for extra API views so they can receive
        json-encoded request parameters.
        """
        format = request.META.get('CONTENT_TYPE', '') or 'application/json'
        if request.body:
            return self.deserialize(request, request.body, format=format)
        else:
            return None

    def _get_obj_for_wrapped_view(self, request, **kwargs):
        """
        Util function for custom views which are wrapped inside an object
        resource url.
        Returns a tuple with either the object which corresponds to
        the request, or an error response.
        """
        basic_bundle = self.build_bundle(request=request)
        self.is_authenticated(request)

        try:
            obj = self.cached_obj_get(bundle=basic_bundle, **self.remove_api_resource_names(kwargs))
        except ObjectDoesNotExist:
            return (None, HttpNotFound())
        except MultipleObjectsReturned:
            return (None, HttpMultipleChoices("More than one resource is found at this URI."))

        self.authorized_read_detail(self.get_object_list(basic_bundle.request), basic_bundle)

        return (obj, None)


class QueryResource(BaseResource):
    _extra = fields.DictField(readonly=True, blank=True, null=True)

    custom_query_filters = {}

    def json_query(self, q):
        "Subclasses can override this to add filters to the object queryset."
        return None

    def get_object_list(self, request):
        queryset = super(QueryResource, self).get_object_list(request)
        filters = {
            'jq': type(self).base_json_query,
        }
        filters.update(self.custom_query_filters)

        for attr, fn in filters.items():
            query = request.GET.get(attr, "")
            if query:
                expr = fn(self, query)
                if expr:
                    queryset = queryset.filter(expr)

        return queryset.distinct()

    def base_json_query(self, json_string):
        try:
            q = json.loads(json_string)
            logger.debug("jq=%s" % json_string, extra={"jq": q})
        except ValueError:
            logger.info("Received malformed json query")
            q = {}
        return self.json_query(q) or Q()

    @staticmethod
    def _get_id(q):
        if isinstance(q, int):
            return q
        elif isinstance(q, str):
            try:
                return int(q, 10)
            except ValueError:
                return None
        return None

    def dehydrate__extra(self, bundle):
        cols = bundle.request.GET.getlist("c") or []
        study_id = bundle.request.GET.get("study") or None
        cols.extend(getattr(self, "initial_extra_fields", None) or [])
        extra = dict((col, self.get_extra_field(bundle, col, study_id))
                     for col in cols)
        return flatten_dict(extra)

    def get_extra_field(self, bundle, name, study_id):
        extra_field = getattr(self, "_extra_field_%s" % name, None)
        if isinstance(extra_field, collections.Callable):
            return extra_field(bundle.obj, study_id)
        else:
            return self.extra_field_fallback(bundle.obj, name, study_id)

    def extra_field_fallback(self, obj, name, study_id):
        """
        Subclasses can override this to insert extra "columns" into the
        output.
        """
        return None


class AnonReadOnlyResource(BaseResource):

    class Meta(BaseResource.Meta):
        authorization = ReadOnlyAuthorization()
        authentication = Authentication()
        list_allowed_methods = ['get']
        detail_allowed_methods = ['get']


class OrmlessObject(object):

    def __init__(self, **kwargs):
        self.__dict__['_data'] = kwargs

    def __getattr__(self, k):
        return self._data.get(k)

    def __setattr__(self, k, v):
        self._data[k] = v


def accesslog(cls):
    "Decorator to enable authenticated user CRUD logging of a resource"
    def log_access(action, bundle, obj=None):
        AccessLog.log(action=action,
                      modified_by=bundle.request.user,
                      ip_address=bundle.request.META['REMOTE_ADDR'],
                      obj=obj or bundle.obj)

    def logged_method(method, original):
        def obj_method(self, bundle, **kwargs):
            obj = original(self, bundle, **kwargs)
            log_access(method, bundle)
            return obj
        return obj_method

    def logged_delete(method, cls):
        orig_delete = cls.obj_delete

        def obj_delete(self, bundle, **kwargs):
            # must separately extract object from bundle and then log,
            # before delete applied
            dead = cls.obj_get(self, bundle=bundle, **kwargs)
            log_access(method, bundle, obj=dead)
            return orig_delete(self, bundle, **kwargs)

        return obj_delete

    cls.obj_create = logged_method("C", cls.obj_create)
    cls.obj_get = logged_method("R", cls.obj_get)
    cls.obj_update = logged_method("U", cls.obj_update)
    cls.obj_delete = logged_delete("D", cls)
    return cls
