from django.db import models
from reversion import revisions

from ..app.models import BaseModel, AuditAndPrivacy, AbstractNameDescList
from ..people.models import Person


class Country(BaseModel):
    iso2 = models.CharField(max_length=2, primary_key=True)
    iso3 = models.CharField(max_length=3)
    name = models.CharField(max_length=200)

    class Meta:
        verbose_name_plural = "countries"

    _str_format = "{0}"
    _str_args = ("name",)


class State(models.Model):
    country = models.ForeignKey(Country, related_name="states")
    name = models.CharField(max_length=200)
    slug = models.SlugField()
    abbrev = models.CharField(max_length=32, verbose_name="Abbreviation")

    class Meta:
        unique_together = ("slug", "country")

    def __str__(self):
        return self.abbrev


class Suburb(models.Model):
    name = models.CharField(max_length=200)
    postcode = models.CharField(max_length=5)
    state = models.ForeignKey(State)

    def __str__(self):
        return self.name

    def address_line(self):
        return "%s, %s, %s" % (self.name, self.state.abbrev, self.postcode)


@revisions.register
class ContactDetails(models.Model):
    """
    Various address details used by various models.

    Would be nice to split address into
    - Attention contact person
    - Business Name
    - Box number
    - Number on street
    - Street name
    - Street type
    where all fields are optional except the street name.

    kintrak table: ut_f653 (Address)
    """
    address_line1 = models.CharField(max_length=1000)
    address_line2 = models.CharField(max_length=1000, blank=True)
    address_line3 = models.CharField(max_length=1000, blank=True)
    address_line4 = models.CharField(max_length=1000, blank=True)
    suburb = models.ForeignKey(Suburb, null=True, blank=True)

    email = models.EmailField(max_length=256, blank=True)
    phone_work = models.CharField(max_length=50, blank=True)
    phone_other = models.CharField(max_length=50, blank=True)
    phone_home = models.CharField(max_length=50, blank=True)
    mobile = models.CharField(max_length=50, blank=True)
    fax = models.CharField(max_length=50, blank=True)

    # optional name: this is for offices and businesses
    contact_person = models.CharField(max_length=256, blank=True)

    class Meta:
        verbose_name_plural = "contact details"

    def __str__(self):
        suburb = self.suburb.address_line() if self.suburb else None
        return " ".join(filter(bool, (self.address_line1, self.address_line2,
                                      self.address_line3, self.address_line4,
                                      suburb)))


class AddressType(AbstractNameDescList):
    """
    AddressType
    kintrak table: lt_f644
    """


@revisions.register(follow=["contact"])
class PersonAddress(AuditAndPrivacy, models.Model):
    """
    Association between person and its address(es).
    """
    person = models.ForeignKey(Person, related_name="addresses")
    contact = models.ForeignKey(ContactDetails)
    type = models.ForeignKey(AddressType)
    comment = models.CharField(max_length=1000, blank=True)  # f492
