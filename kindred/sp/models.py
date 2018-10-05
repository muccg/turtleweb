# service provider models

from django.db import models

from ..app.models import BaseModel, AuditAndPrivacy, AbstractNameList
from ..people.models import Person
from ..users.models import User
from ..contacts.models import ContactDetails


class DoctorType(AbstractNameList):
    desc = models.CharField(max_length=200, blank=True)


class Doctor(Person):
    """
    Someone who consults patients for money.
    """
    type = models.ForeignKey(DoctorType)
    active = models.BooleanField(default=True)
    provider_num = models.CharField(max_length=100, verbose_name="Provider Number")
    gp_number = models.CharField(max_length=100, blank=True, verbose_name="GP Number")
    doctor_primary_care_trust_no = models.CharField(max_length=100, blank=True)
    contact = models.ForeignKey(ContactDetails, null=True)

    def __str__(self):
        return "%s (%s)" % (super(Doctor, self).__str__(), self.type)


class PersonDoctor(AuditAndPrivacy, BaseModel):
    """
    An association of Person to Doctor. Need to come up with a better
    name.

    This is a combination of Doctor and Doctors tables from kintrak.
    """
    ROLE_CHOICES = (("pri", "Primary"),
                    ("sec", "Secondary"),
                    ("res", "Research"),
                    ("adm", "Admin Only"),
                    ("old", "Old Address"))   # I question the need for this choice

    person = models.ForeignKey(Person)
    doctor = models.ForeignKey(Doctor, related_name="fixme_assoc_set")
    role = models.CharField(max_length=3, choices=ROLE_CHOICES)
    role_comment = models.CharField(max_length=1000, blank=True)   # fixme: why did i put this here?
    current = models.BooleanField(default=False)

    # reminder stuff could possibly go in another table
    remind_client = models.BooleanField(default=True)
    remind_gp = models.BooleanField(default=True)
    start_reminders = models.DateField(null=True, blank=True, auto_now=True)
    stop_reminders = models.DateField(null=True, blank=True)

    class Meta:
        unique_together = ("person", "doctor", "role")

    _str_format = "{0} is doctor for {1}"
    _str_args = ("doctor", "person")


class ServiceProvider(AbstractNameList):
    pass


class StaffMemberType(AbstractNameList):
    pass


class StaffMember(User):
    """
    Not sure whose staff these correspond to.
    This is a combination of StaffMember and OrderedBy

    kintrak table: lt_f665 StaffMember
    kintrak table: lt_f666 OrderedBy
    """
    type = models.ForeignKey(StaffMemberType)   # f594
    default_service_provider = models.ForeignKey(ServiceProvider, null=True, blank=True)   # f916

    # Some usernames were prefixed with Z. I assume this means the
    # users are inactive and they wanted to get them out of the way.
    # This is kinda unfair to users whose surnames begin with Z, but
    # luckily there are none of those in the database.
    # Only problem with this system is that kintrak lacks referential
    # integrity, and some staff member foreign keys are missing the Z.
    # has_z = models.BooleanField()

    # what is this???
    can_send_account = models.NullBooleanField()   # f595


class ReferralSource(AbstractNameList):
    """
    ReferralSource
    kintrak table: lt_f652
    """
    # i question the need for the desc field
    desc = models.CharField(max_length=1000, blank=True)   # f583
    show_doctor_list = models.BooleanField(default=False)   # f1230

    # expiry_weeks is always null in kintrak
    # expiry_weeks = models.PositiveSmallIntegerField()


class Referral(AuditAndPrivacy, models.Model):
    """
    Referrals
    kintrak table: ut_f661
    """
    CLOSURE_CHOICES = (("N", "Appointment Not Required"),
                       ("C", "Completed"),
                       ("R", "Patient Request"))

    person = models.ForeignKey(Person, related_name="patient_referrals")

    to = models.ForeignKey(Doctor, null=True, blank=True, related_name="doctor_referrals")
    date = models.DateField()
    comment = models.CharField(max_length=1024, blank=True)
    letter = models.NullBooleanField()

    start_date = models.DateField()
    expiry_date = models.DateField(null=True, blank=True)
    closure_date = models.DateField(null=True, blank=True)
    reason_for_closure = models.CharField(max_length=1, choices=CLOSURE_CHOICES)

    source = models.ForeignKey(ReferralSource)
    service_provider = models.ForeignKey(ServiceProvider, null=True, blank=True)

    # fixme: staff_member should not be nullable. However there are
    # 45340 referrals with "Genetic Services WA" as the staff member. "GSWA" is also a service provider.
    # Maybe a null here implies to just use the service provider.
    staff_member = models.ForeignKey(StaffMember, null=True)

    by = models.ForeignKey(Doctor, related_name="referrals_made", null=True, blank=True)
    self_referral = models.BooleanField(default=False)   # fixme: where did this come from again?

    # This can be empty/unknown, "Self Referral", or a doctor name
    # would be nicer if this was a foreign key to doctor.
    # by = models.CharField(max_length=1000, blank=True)


class SurveillanceLocation(AbstractNameList):
    """
    SurveillanceLocation
    kintrak table: lt_f690
    """


class SurveillanceOutcome(AbstractNameList):
    """
    SurveillanceOutcome
    kintrak table: lt_f691
    """


class SurveillanceTiming(AbstractNameList):
    """
    SurveillanceTiming
    kintrak table: lt_f693
    """


class SurveillanceType(AbstractNameList):
    """
    SurveillanceType
    kintrak table: lt_f694
    """


class Surveillance(AuditAndPrivacy, models.Model):
    """
    Surveillance
    kintrak table: ut_f705
    """
    person = models.ForeignKey(Person)

    doctor = models.ForeignKey(Doctor, blank=True, related_name="doctor_surveillance_set")   # f740
    service_provider = models.ForeignKey(ServiceProvider, null=True, blank=True)   # f633

    type = models.ForeignKey(SurveillanceType, null=True, blank=True)   # f694
    interval = models.IntegerField(help_text="Period in minutes between surveillances")   # f947
    comment = models.TextField(blank=True)   # f553

    date_done = models.DateField(null=True, blank=True)   # f548
    date_due = models.DateField(null=True, blank=True)   # f550
    date_reminder_sent = models.DateField(null=True, blank=True)   # f551

    # fixme: diagnosis is almost the same as diagnosis index except
    # for 6 values, 2 of which are typos.
    # diagnosis = models.ForeignKey(DiagnosisIndex, null=True, blank=True)   # f718
    diagnosis = models.CharField(max_length=254, blank=True)   # f718

    location = models.ForeignKey(SurveillanceLocation, blank=True)   # f690
    outcome = models.ForeignKey(SurveillanceOutcome, blank=True)   # f691
    timing = models.ForeignKey(SurveillanceTiming, blank=True)   # f693


class Hospital(AbstractNameList):
    """
    List of hospitals.
    This is used by turtle event fields.
    """
    pass
