from tastypie import fields
import tastypie.constants

from ..sp import models as sp
from .base import register, accesslog, make_generic_resource, BaseResource
from .people import BasePersonResource, PersonResource

ServiceProviderResource = make_generic_resource(sp.ServiceProvider)
SurveillanceLocationResource = make_generic_resource(sp.SurveillanceLocation)
SurveillanceOutcomeResource = make_generic_resource(sp.SurveillanceOutcome)
SurveillanceTimingResource = make_generic_resource(sp.SurveillanceTiming)
SurveillanceTypeResource = make_generic_resource(sp.SurveillanceType)
ReferralSourceResource = make_generic_resource(sp.ReferralSource)


@register
class StaffMemberResource(BasePersonResource):
    type = fields.ForeignKey("kindred.api.sp.StaffMemberTypeResource", "type")
    default_service_provider = fields.ForeignKey(ServiceProviderResource,
                                                 "default_service_provider",
                                                 full=True, null=True)

    class Meta(BasePersonResource.Meta):
        queryset = sp.StaffMember.objects.all()
        ordering = ["last_name", "first_name"]


@accesslog
@register
class DoctorResource(BasePersonResource):
    title = fields.ForeignKey("kindred.api.people.TitleResource", "title", full=True)
    type = fields.ForeignKey("kindred.api.sp.DoctorTypeResource", "type", full=True)
    contact = fields.ForeignKey("kindred.api.contacts.ContactDetailsResource", "contact", full=True, null=True)

    class Meta(BasePersonResource.Meta):
        # fixme: add some select_related !!!
        queryset = sp.Doctor.objects.all()
        ordering = ["id", "last_name", "first_name", "initials", "title", "type", "sex"]
        filtering = {
            "first_name": tastypie.constants.ALL,
            "last_name": tastypie.constants.ALL,
            "other_name": tastypie.constants.ALL,
            "sex": tastypie.constants.ALL,
            "contact": tastypie.constants.ALL_WITH_RELATIONS,
            "type": tastypie.constants.ALL_WITH_RELATIONS,
        }


@register
class PersonDoctorResource(BaseResource):
    person = fields.ForeignKey(PersonResource, "person")
    doctor = fields.ForeignKey(DoctorResource, "doctor", full=True)

    class Meta(BaseResource.Meta):
        queryset = sp.PersonDoctor.objects.all()
        ordering = ["person", "current", "role"]
        filtering = {
            "person": tastypie.constants.ALL,
            "doctor": tastypie.constants.ALL,
        }


@accesslog
@register
class SurveillanceResource(BaseResource):
    person = fields.ForeignKey(PersonResource, "person")
    doctor = fields.ForeignKey(DoctorResource, "doctor", full=True, null=True)
    service_provider = fields.ForeignKey(ServiceProviderResource, "service_provider",
                                         full=True, null=True)
    type = fields.ForeignKey(SurveillanceTypeResource, "type", full=True, null=True)
    location = fields.ForeignKey(SurveillanceLocationResource, "location", full=True, null=True)
    outcome = fields.ForeignKey(SurveillanceOutcomeResource, "outcome", full=True, null=True)
    timing = fields.ForeignKey(SurveillanceTimingResource, "timing", full=True, null=True)

    class Meta(BaseResource.Meta):
        limit = 0
        max_limit = 0
        ordering = ["date_done"]
        queryset = sp.Surveillance.objects.all()
        filtering = {
            "person": tastypie.constants.ALL,
        }


@register
class ReferralResource(BaseResource):
    person = fields.ForeignKey(PersonResource, "person", full=True)
    to = fields.ForeignKey(DoctorResource, "to", full=True, null=True)
    source = fields.ForeignKey(ReferralSourceResource, "source", full=True, null=True)
    service_provider = fields.ForeignKey(ServiceProviderResource, "service_provider", full=True, null=True)
    staff_member = fields.ForeignKey(StaffMemberResource, "staff_member", full=True, null=True)
    by = fields.ForeignKey(DoctorResource, "by", full=True, null=True)

    class Meta(BaseResource.Meta):
        limit = 0
        max_limit = 0
        queryset = sp.Referral.objects.all()
        ordering = ["start_date", "end_date", "by__surname"]
        filtering = {
            "person": tastypie.constants.ALL,
        }


@register
class DoctorTypeResource(BaseResource):
    class Meta(BaseResource.Meta):
        queryset = sp.DoctorType.objects.all()
        ordering = ["order"]
        filtering = {
            "name": tastypie.constants.ALL,
        }
