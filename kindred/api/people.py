import logging

from django.db.models import Q

from tastypie import fields
import tastypie.constants

from ..people import models as people
from ..project import models as project
from .base import register, accesslog, BaseResource, QueryResource
from ..query import person_query_expr

logger = logging.getLogger(__name__)


class BasePersonResource(QueryResource):
    title = fields.ForeignKey("kindred.api.people.TitleResource", "title", full=True)
    data = fields.DictField(attribute="data", blank=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = people.Person.objects.all()
        ordering = ["id", "last_name", "first_name", "other_name",
                    "title", "dob", "dod", "sex", "patient_id"]
        filtering = {
            "first_name": tastypie.constants.ALL,
            "last_name": tastypie.constants.ALL,
            "other_name": tastypie.constants.ALL,
            "sex": tastypie.constants.ALL,
            "dob": tastypie.constants.ALL,
            "dod": tastypie.constants.ALL,
        }

    def build_filters(self, filters=None):
        if filters is None:
            filters = {}
        orm_filters = super().build_filters(filters)

        # this cookie is needed when building json query expression
        self.study_id = self.patient_study_filter(filters)

        if self.study_id is not None:
            orm_filters["studies__study"] = self.study_id

        return orm_filters

    def json_query(self, q):
        return person_query_expr(q, self.study_id)

    def get_orm_pks(self, q):
        return self.Meta.queryset.filter(q or Q()).values_list("id", flat=True)

    def patient_study_filter(self, filters):
        study_id = filters.get("study", "")
        if study_id:
            try:
                return int(study_id)
            except ValueError:
                pass
        return None

    def study_group_filter(self, study_group_id):
        id = self._get_id(study_group_id)
        return Q(study_groups__id=id) if id else Q()

    custom_query_filters = {
        'study_group': study_group_filter,
    }

    initial_extra_fields = ["consent"]

    def _extra_field_consent(self, obj, study_id):
        return obj.consent_status_dict(study_id)


@accesslog
@register
class PersonResource(BasePersonResource):
    mother = fields.ToOneField("self", "mother", null=True)
    father = fields.ToOneField("self", "father", null=True)

    class Meta(BasePersonResource.Meta):
        filtering = {
            "first_name": tastypie.constants.ALL,
            "last_name": tastypie.constants.ALL,
            "other_name": tastypie.constants.ALL,
            "sex": tastypie.constants.ALL,
            "upn": tastypie.constants.ALL,
            "dob": tastypie.constants.ALL,
            "dod": tastypie.constants.ALL,

            # used for quick search in person dropdown
            "id": ("exact",),

            # filters to find children of a person.
            # could make a generic "parent" filter as well
            "father": tastypie.constants.ALL,
            "mother": tastypie.constants.ALL,
        }


class BriefPersonResource(BasePersonResource):
    """
    A person resource for embedding in other resources.
    This resource doesn't have a registered endpoint.
    """
    class Meta(BasePersonResource.Meta):
        fields = ["id", "first_name", "last_name", "other_name", "patient_id"]
        resource_name = "person"


class BriefFamilyMemberResource(BaseResource):
    person = fields.ForeignKey(PersonResource, "person", full=True)
    family_group = fields.ForeignKey("kindred.api.people.FamilyGroupResource", "family_group")

    class Meta(BaseResource.Meta):
        queryset = people.FamilyMember.objects.all()
        resource_name = "familymember"


@accesslog
@register
class FamilyGroupResource(BaseResource):
    members = fields.ToManyField(BriefFamilyMemberResource, "familymember_set",
                                 full=True, full_list=False, null=True)

    class Meta(BaseResource.Meta):
        queryset = people.FamilyGroup.objects.all().select_related("members__person")
        filtering = {
            "members": tastypie.constants.ALL,
            "desc": tastypie.constants.ALL,
        }


@accesslog
@register
class FamilyMemberResource(BaseResource):
    person = fields.ForeignKey(PersonResource, "person")
    family_group = fields.ForeignKey(FamilyGroupResource, "family_group", full=True)

    class Meta(BaseResource.Meta):
        queryset = people.FamilyMember.objects.all().select_related("person", "family_group")
        filtering = {
            "person": tastypie.constants.ALL,
        }


@accesslog
@register
class NoChildrenResource(BaseResource):
    male = fields.ForeignKey(BriefPersonResource, "male")
    female = fields.ForeignKey(BriefPersonResource, "female")

    class Meta(BaseResource.Meta):
        queryset = people.NoChildren.objects.all().select_related("male", "female")
        filtering = {
            "male": tastypie.constants.ALL,
            "female": tastypie.constants.ALL,
            "reason": tastypie.constants.ALL,
        }


def get_studies(bundle):
    return project.Study.objects.filter(members__patient=bundle.obj.id)


@register
class PersonDupResource(BasePersonResource):
    """
    A resource for looking up potential duplicates of new person
    records.
    """

    studies = fields.ToManyField("kindred.api.project.StudyResource",
                                 get_studies, full=True, null=True)

    class Meta(BasePersonResource.Meta):
        ordering = ["id"]
        fields = ["id", "patient_id", "first_name", "last_name", "other_name", "dob", "sex"]
        resource_name = "persondup"
