from tastypie import fields
import tastypie.constants
from tastypie.authorization import DjangoAuthorization
from tastypie.authentication import SessionAuthentication
from tastypie.resources import Resource, Bundle

from ..org import models as org
from .base import register, accesslog, make_generic_resource, BaseResource, OrmlessObject
from .people import PersonResource
from .sp import ServiceProviderResource, StaffMemberResource, DoctorResource


ContactTypeResource = make_generic_resource(org.ContactType)


@accesslog
@register
class AppointmentRequestResource(BaseResource):
    person = fields.ForeignKey(PersonResource, "person", full=True)
    service_provider = fields.ForeignKey(ServiceProviderResource, "service_provider",
                                         full=True, null=True)
    type = fields.ForeignKey("kindred.api.org.AppointmentRequestTypeResource", "type",
                             full=True, null=True)
    staff_member = fields.ForeignKey(StaffMemberResource, "staff_member", full=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = org.AppointmentRequest.objects.all()
        filtering = {
            "person": tastypie.constants.ALL,
            "type": tastypie.constants.ALL,
            "reason_stopped": tastypie.constants.ALL,
            "comment": ("exact", "istartswith"),
        }

    def build_filters(self, filters=None):
        if filters is None:
            filters = {}

        orm_filters = super(AppointmentRequestResource, self).build_filters(filters)

        # frontend needs to filter on session status, so
        # work around the weird reason_stopped field
        if "stopped" in filters:
            vals = ("C",) if filters["stopped"] else ("", "T")
            orm_filters["reason_stopped__in"] = vals

        return orm_filters


@register
class ClinicResource(BaseResource):
    rooms = fields.ToManyField("kindred.api.org.ClinicRoomResource",
                               "clinicroom_set", full=True, null=True)

    class Meta(BaseResource.Meta):
        limit = 0
        max_limit = 0
        ordering = ["group"]
        queryset = org.Clinic.objects.all()
        filtering = {
            "group": tastypie.constants.ALL,
            "type": tastypie.constants.ALL,
        }


@register
class SessionTemplateResource(BaseResource):
    room = fields.ForeignKey("kindred.api.org.ClinicRoomResource", "room")
    group = fields.ForeignKey("kindred.api.org.SessionTemplateGroupResource", "group", null=True)
    staff = fields.ToManyField("kindred.api.org.SessionTemplateStaffResource", "staff", null=True)
    # times = fields.ToManyField("kindred.api.org.SessionTemplateTimeResource",
    #                            "times", null=True, full=True)

    class Meta(BaseResource.Meta):
        queryset = org.SessionTemplate.objects.all()
        filtering = {
            "room": tastypie.constants.ALL,
            "staff": tastypie.constants.ALL_WITH_RELATIONS,
        }


@register
class SessionTemplateTimeResource(BaseResource):
    template = fields.ForeignKey(SessionTemplateResource, "template")

    class Meta(BaseResource.Meta):
        # fixme: should make this a subresource of session template
        queryset = org.SessionTemplateTime.objects.all()
        filtering = {
            "template": tastypie.constants.ALL,
            "start": tastypie.constants.ALL,
        }


class FreeBusyResource(BaseResource):
    class Meta(BaseResource.Meta):
        ordering = ["item"]
        filtering = {
            "item": tastypie.constants.ALL,
            "start": tastypie.constants.ALL,
        }

    def dehydrate(self, bundle):
        """
        Adds information about whether appointments are booked during the
        freebusy time.
        """
        appts = bundle.obj.appointments_within()
        bundle.data["appointments"] = list(appts.values("id", "start", "duration"))
        return bundle

    def hydrate(self, bundle):
        if "appointments" in bundle.data:
            del bundle.data["appointments"]
        return bundle


@register
class StaffFreeBusyResource(FreeBusyResource):
    item = fields.ForeignKey("kindred.api.sp.StaffMemberResource", "item")

    class Meta(FreeBusyResource.Meta):
        queryset = org.StaffFreeBusy.objects.all()


@register
class RoomFreeBusyResource(FreeBusyResource):
    item = fields.ForeignKey("kindred.api.org.ClinicRoomResource", "item")

    class Meta(FreeBusyResource.Meta):
        queryset = org.RoomFreeBusy.objects.all()


class AppointmentAttendeeResource(BaseResource):
    person = fields.ForeignKey("kindred.api.people.BriefPersonResource", "person", full=True)
    appointment = fields.ForeignKey("kindred.api.org.AppointmentResource", "appointment")

    class Meta(BaseResource.Meta):
        queryset = org.AppointmentAttendee.objects.all()
        filtering = {
            "person": tastypie.constants.ALL,
            "appointment": tastypie.constants.ALL,
        }


class StaffAttendeeResource(BaseResource):
    staff_member = fields.ForeignKey("kindred.api.sp.StaffMemberResource", "staff_member")
    appointment = fields.ForeignKey("kindred.api.org.AppointmentResource", "appointment")

    class Meta(BaseResource.Meta):
        queryset = org.StaffAttendee.objects.all()
        filtering = {
            "staff_member": tastypie.constants.ALL,
            "appointment": tastypie.constants.ALL,
        }


@register
class AppointmentResource(BaseResource):
    # fixme: this resource has terrible performance due to attendee
    # and staff lookups.  probably need to use Resource instead of
    # ModelResource to get decent performance.
    room = fields.ForeignKey("kindred.api.org.ClinicRoomResource", "room")
    attendees = fields.ToManyField(AppointmentAttendeeResource, "attendees",
                                   related_name="appointment",
                                   null=True, full=True)
    staff = fields.ToManyField(StaffAttendeeResource, "staff",
                               related_name="appointment",
                               null=True, full=True)
    request = fields.ToOneField(AppointmentRequestResource, "request", null=True)

    # kintrak fields, don't really want them
    # person = fields.ForeignKey(BriefPersonResource, "person", full=True)
    # type = fields.ForeignKey("kindred.api.org.AppointmentTypeResource", "type",
    #                          full=True, null=True)
    # staff_member = fields.ForeignKey("kindred.api.sp.StaffMemberResource", "staff_member",
    #                                  null=True)

    class Meta(BaseResource.Meta):
        ordering = ["start", "room"]
        queryset = org.Appointment.objects.all().select_related("attendees__person", "staff__staff_member", "room", "request").prefetch_related("attendees__person", "staff__staff_member")
        filtering = {
            "room": tastypie.constants.ALL,
            "start": tastypie.constants.ALL,
            "staff": tastypie.constants.ALL_WITH_RELATIONS,
            "attendees": tastypie.constants.ALL_WITH_RELATIONS,
        }


@register
class AppointmentBriefResource(BaseResource):
    """
    A faster version of AppointmentResource.
    """
    room = fields.ForeignKey("kindred.api.org.ClinicRoomResource", "room")
    request = fields.ToOneField(AppointmentRequestResource, "request")

    class Meta(BaseResource.Meta):
        ordering = ["start", "room"]
        queryset = org.Appointment.objects.all()
        filtering = {
            "room": tastypie.constants.ALL,
            "start": tastypie.constants.ALL,
        }

    def build_filters(self, filters=None):
        if filters is None:
            filters = {}

        orm_filters = super(AppointmentBriefResource, self).build_filters(filters)

        if "person" in filters:
            orm_filters["attendees__person_id"] = filters["person"]
        if "staff_member" in filters:
            orm_filters["staff__staff_member_id"] = filters["staff_member"]

        return orm_filters


@register
class AlertsResource(Resource):
    pk = fields.CharField('pk')
    num_appt_reqs = fields.CharField("num_appt_reqs")

    class Meta:
        resource_name = "alerts"
        object_class = OrmlessObject
        authorization = DjangoAuthorization()
        authentication = SessionAuthentication()
        limit = 0
        max_limit = 0

    def obj_get_list(self, request=None, **kwargs):
        return [self.obj_get(request, **kwargs)]

    def obj_get(self, request=None, **kwargs):
        req = org.AppointmentRequest.objects.filter(end_date__isnull=True, reason_stopped="")
        return OrmlessObject(pk=0, num_appt_reqs=req.count())

    def detail_uri_kwargs(self, bundle_or_obj):
        if isinstance(bundle_or_obj, Bundle):
            obj = bundle_or_obj.obj
        else:
            obj = bundle_or_obj
        return {'pk': obj.pk}


@register
class ContactResource(BaseResource):
    person = fields.ForeignKey(PersonResource, "person", full=True)
    staff_member = fields.ForeignKey(StaffMemberResource, "staff_member", full=True, null=True)
    doctor = fields.ForeignKey(DoctorResource, "doctor", full=True, null=True)
    type = fields.ForeignKey(ContactTypeResource, "type", full=True)
    service_provider = fields.ForeignKey(ServiceProviderResource, "service_provider", full=True, null=True)

    class Meta(BaseResource.Meta):
        ordering = ["date_done"]
        queryset = org.Contact.objects.all()
        filtering = {
            "person": tastypie.constants.ALL,
            "staff_member": tastypie.constants.ALL,
            "type": tastypie.constants.ALL,
            "doctor": tastypie.constants.ALL,
            "service_provider": tastypie.constants.ALL,
        }
