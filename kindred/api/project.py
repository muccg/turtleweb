from django.conf.urls import url

from tastypie import fields
from tastypie.utils import trailing_slash
from tastypie.http import HttpBadRequest

import tastypie.constants

from .base import register, accesslog, BaseResource
from ..project import models as project
from ..query import person_query_expr
from ..people import models as people


@register
class StudyResource(BaseResource):
    data = fields.DictField(attribute="data", blank=True, null=True)
    num_members = fields.IntegerField(readonly=True)
    num_consent = fields.IntegerField(readonly=True)

    class Meta(BaseResource.Meta):
        queryset = project.Study.objects.all()
        filtering = {
            "slug": tastypie.constants.ALL,
            "name": tastypie.constants.ALL,
        }

    def dehydrate_num_members(self, bundle):
        return bundle.obj.members.count()

    def dehydrate_num_consent(self, bundle):
        return bundle.obj.num_consent()


@accesslog
@register
class StudyGroupResource(BaseResource):
    study = fields.ToOneField("kindred.api.project.StudyResource", "study")
    members = fields.ToManyField("kindred.api.people.BriefPersonResource", "members",
                                 full=True, full_list=False, blank=True, null=True)
    owner = fields.ToOneField("kindred.api.users.UserResource", "owner")
    data = fields.DictField(attribute="data", blank=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = project.StudyGroup.objects.all()
        filtering = {
            "name": tastypie.constants.ALL,
            "study": tastypie.constants.ALL_WITH_RELATIONS,
            "owner": tastypie.constants.ALL,
            "members": tastypie.constants.ALL_WITH_RELATIONS,
        }

    def prepend_urls(self):
        urls = [
            url(r"^(?P<resource_name>%s)/(?P<pk>\w+)/append%s$" %
                (self._meta.resource_name, trailing_slash()),
                self.wrap_view('do_append'), name="api_study_group_append"),
        ]
        urls.extend(super().prepend_urls())
        return urls

    def do_append(self, request, **kwargs):
        """
        Special view for adding the results of a search to a study group.
        """
        self.method_check(request, allowed=['post'])
        obj, err = self._get_obj_for_wrapped_view(request, **kwargs)
        if err:
            return err
        data = self._get_json_request_data(request)

        if data is None:
            return HttpBadRequest("Need JSON request body")

        jq = data.get("jq", None)

        expr = person_query_expr(jq, obj.study_id)
        qs = people.Person.objects.filter(expr)
        existing = obj.members.all()
        add = qs.exclude(id__in=existing)

        if data.get("append", False):
            obj.members.add(*add)

        return self.create_response(request, {
            'success': True,
            'total': qs.count(),
            'added': add.count()
        })


@accesslog
@register
class StudyMemberResource(BaseResource):
    study = fields.ToOneField("kindred.api.project.StudyResource", "study")
    patient = fields.ToOneField("kindred.api.people.PersonResource", "patient")
    consents = fields.ToManyField("kindred.api.project.StudyConsentResource",
                                  "consents", related_name="study_member",
                                  full=True, blank=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = project.StudyMember.objects.all()
        filtering = {
            "study": tastypie.constants.ALL,
            "patient": tastypie.constants.ALL,
        }


@accesslog
@register
class StudyConsentResource(BaseResource):
    study_member = fields.ToOneField(StudyMemberResource, "study_member")
    status = fields.ToOneField("kindred.api.project.ConsentStatusResource",
                               "status")
    consented_by = fields.ToOneField("kindred.api.project.ConsentObtainedByResource",
                                     "consented_by", blank=True, null=True)
    data = fields.DictField(attribute="data", blank=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = project.StudyConsent.objects.all()


@accesslog
@register
class PatientCaseResource(BaseResource):
    study = fields.ToOneField("kindred.api.project.StudyResource", "study")

    class Meta(BaseResource.Meta):
        queryset = project.PatientCase.objects.all()
        filtering = {
            "study": tastypie.constants.ALL,
            "name": tastypie.constants.ALL,
        }


@accesslog
@register
class PatientHasCaseResource(BaseResource):
    study_member = fields.ToOneField(StudyMemberResource, "study_member")
    case = fields.ToOneField(PatientCaseResource, "case", full=True)

    class Meta(BaseResource.Meta):
        queryset = project.PatientHasCase.objects.all()
        filtering = {
            "case": tastypie.constants.ALL_WITH_RELATIONS,
            "study_member": tastypie.constants.ALL_WITH_RELATIONS,
        }


@accesslog
@register
class CustomDataSchemaResource(BaseResource):
    content_type = fields.ToOneField("kindred.api.common.ContentTypeResource",
                                     "content_type", full=True)
    study = fields.ToOneField(StudyResource, "study", null=True, blank=True)
    schema = fields.DictField(attribute="schema", blank=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = project.CustomDataSchema.objects.all()
