from tastypie import fields
import tastypie.constants

from ..contacts import models as contacts
from .base import register, accesslog, BaseResource, AnonReadOnlyResource
from .people import PersonResource


@register
class StateResource(AnonReadOnlyResource):
    country = fields.ForeignKey("kindred.api.contacts.CountryResource", "country")

    class Meta(AnonReadOnlyResource.Meta):
        queryset = contacts.State.objects.all()
        filtering = {
            "name": tastypie.constants.ALL,
            "abbrev": tastypie.constants.ALL,
            "country__iso2": tastypie.constants.ALL,
        }


@register
class CountryResource(AnonReadOnlyResource):
    states = fields.ToManyField(StateResource, "states", full=True)

    class Meta(AnonReadOnlyResource.Meta):
        queryset = contacts.Country.objects.all()
        filtering = {
            "name": tastypie.constants.ALL,
            "iso2": tastypie.constants.ALL,
        }


@register
class SuburbResource(AnonReadOnlyResource):
    state = fields.ForeignKey(StateResource, "state", full=True)

    class Meta(AnonReadOnlyResource.Meta):
        limit = 0
        queryset = contacts.Suburb.objects.all()
        filtering = {
            "state__abbrev": tastypie.constants.ALL,
            "state__country__iso2": tastypie.constants.ALL,
            "name": tastypie.constants.ALL,
            "postcode": tastypie.constants.ALL,
            "state": tastypie.constants.ALL_WITH_RELATIONS,
        }


@accesslog
@register
class ContactDetailsResource(BaseResource):
    suburb = fields.ForeignKey(SuburbResource, "suburb", full=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = contacts.ContactDetails.objects.all()
        filtering = {
            "address_line1": tastypie.constants.ALL,
            "suburb": tastypie.constants.ALL_WITH_RELATIONS
        }


@accesslog
@register
class PersonAddressResource(BaseResource):
    person = fields.ForeignKey(PersonResource, "person")
    contact = fields.ForeignKey(ContactDetailsResource, "contact", full=True)
    type = fields.ForeignKey("kindred.api.contacts.AddressTypeResource", "type", full=True)

    class Meta(BaseResource.Meta):
        queryset = contacts.PersonAddress.objects.all()
        filtering = {
            "person": tastypie.constants.ALL,
        }
