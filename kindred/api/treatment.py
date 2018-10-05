from tastypie import fields
import tastypie.constants

from kindred.api.base import register, accesslog, BaseResource

from ..treatment import models as treatment


@register
class InterventionResource(BaseResource):
    class Meta(BaseResource.Meta):
        queryset = treatment.Intervention.objects.all()
        filtering = {
            "slug": tastypie.constants.ALL,
            "name": tastypie.constants.ALL,
        }


@register
@accesslog
class TreatmentResource(BaseResource):
    person = fields.ToOneField("kindred.api.people.PersonResource", "person")
    intervention = fields.ToOneField(InterventionResource, "intervention")
    data = fields.DictField(attribute="data", blank=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = treatment.Treatment.objects.all()
        filtering = {
            "person": tastypie.constants.ALL,
            "intervention": tastypie.constants.ALL_WITH_RELATIONS,
        }
