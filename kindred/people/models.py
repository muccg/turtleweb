from django.db import models
from django.db.models import Q
from kindred.jsonb import JSONField
from reversion import revisions

from ..app.models import BaseModel, AbstractNameList
from ..app.utils import init_record_id


def default_title():
    empty = Title.objects.filter(name="").order_by("id")
    return empty.values_list("id", flat=True).first()


@revisions.register(follow=["addresses"])
class Person(models.Model):
    """
    Model which represents patients, their families and unborn babies.

    Users, staff members, doctors, and other "people" entities also
    inherit from this model.
    """
    SEX_CHOICES = (("", "Unknown"),
                   ("M", "Male"),
                   ("F", "Female"))

    first_name = models.CharField(max_length=256)
    second_name = models.CharField(max_length=256, blank=True)
    last_name = models.CharField(max_length=256)
    maiden_name = models.CharField(max_length=256, blank=True,
                                   help_text="Surname prior to marital name change")
    other_name = models.CharField(max_length=256, blank=True,
                                  help_text="Other previous surnames")
    title = models.ForeignKey("Title", default=default_title,
                              on_delete=models.PROTECT)
    initials = models.CharField(max_length=64, blank=True,
                                help_text="Initials of given names. If blank, value will be derived from names")

    sex = models.CharField(max_length=1, choices=SEX_CHOICES)
    born = models.BooleanField(default=True, help_text="Is this person born yet?")
    deceased = models.BooleanField(default=False, help_text="Has this person died?")
    dob = models.DateField(null=True, blank=True, verbose_name="Date of Birth",
                           db_index=True, help_text="Date of birth, if known")
    dod = models.DateField(null=True, blank=True, verbose_name="Date of Death",
                           db_index=True, help_text="Date of death, if known")
    dob_checked = models.BooleanField(default=True, verbose_name="DOB Checked",
                                      help_text="It is verified that the birth date is correct")
    dod_checked = models.BooleanField(default=True, verbose_name="DOD Checked",
                                      help_text="It is verified that the death date is correct")
    place_of_birth = models.CharField(max_length=256, blank=True)
    cause_of_death = models.CharField(max_length=256, blank=True)

    mother = models.ForeignKey("self", null=True, blank=True,
                               on_delete=models.SET_NULL,
                               related_name="maternal_children")
    father = models.ForeignKey("self", null=True, blank=True,
                               on_delete=models.SET_NULL,
                               related_name="paternal_children")

    twins = models.ManyToManyField("self", blank=True)
    twins_identical = models.BooleanField(default=False,
                                          help_text="Monozygotic/Dizygotic - Identical/Fraternal")

    comment = models.TextField(blank=True)
    data = JSONField(null=True, blank=True, help_text="Fields as defined by the user")

    patient_id = models.CharField(max_length=30, unique=True, default="")

    class Meta:
        ordering = ["id"]

    @staticmethod
    def make_id(id):
        return "P-%06d" % id

    @init_record_id("patient_id")
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def get_short_name(self):
        return self.first_name

    def get_full_name(self):
        "Returns all names from first to last"
        return " ".join(v for v in [self.first_name, self.second_name,
                                    self.other_name, self.last_name]
                        if v)

    def get_formal_name(self):
        "Returns title and surname"
        return "%s %s" % (self.title, self.last_name)

    def get_pid_full_name(self):
        return " ".join(v for v in [self.patient_id, self.get_full_name()] if v)

    def get_reverse_name(self):
        given_names = " ".join([self.first_name, self.second_name,
                                self.other_name])
        return ", ".join([self.last_name, given_names])

    def __str__(self):
        name = self.get_full_name()
        return " ".join([self.patient_id] + ([name] if name else []))

    def __repr__(self):
        return "<%s: [id=%s] %s>" % (self.__class__.__name__, self.id, self.get_full_name())

    @property
    def paternal_siblings(self):
        return Person.objects.filter(father=self.father)
        return self.father.paternal_children

    @property
    def maternal_siblings(self):
        # return Person.objects.filter(mother=self.mother)
        return self.mother.maternal_children

    @property
    def siblings(self):
        return Person.objects.filter(Q(mother=self.mother) | Q(father=self.father))

    def consent_status_dict(self, study_id):
        from ..project.models import StudyConsent
        consent = StudyConsent.objects.filter(study_member__study_id=study_id,
                                              study_member__patient=self)
        vals = consent.values("status__name", "date").first()
        if vals:
            return {
                "consent": vals["status__name"],
                "consent_date": vals["date"],
            }
        else:
            return None

    def consent_status(self, study_id):
        d = self.consent_status_dict(study_id)
        return d["consent"] if d else None

    def consent_date(self, study_id):
        d = self.consent_status_dict(study_id)
        return d["consent_date"] if d else None


class Title(AbstractNameList):
    """
    List of possible salutations of a person.
    kintrak table: lt_f24
    """
    pass


class EthnicGroup(AbstractNameList):
    """
    EthnicGroup
    kintrak table: lt_f703
    """


class NoChildren(BaseModel):
    """
    This model represents a relationship which has no children. There
    doesn't need to be a reason not to have children but this
    information can be supplied if relevant.
    """
    REASON_CHOICES = (("O", "Other Reason"),
                      ("I", "Infertility"))

    male = models.ForeignKey(Person, related_name="+")
    female = models.ForeignKey(Person, related_name="+")
    reason = models.CharField(max_length=1, blank=True, choices=REASON_CHOICES)
    notes = models.TextField(blank=True)

    class Meta(BaseModel.Meta):
        unique_together = (("male", "female"),)
        index_together = (("male", "female"),)

    def check_valid(self):
        """
        A NoChildren entry should only exist if the couple doesn't
        actually have children.
        """
        return not Person.objects.filter(mother=self.female, father=self.male).exists()


class FamilyGroup(BaseModel):
    """
    Persons are linked together by their pedigree.

    This model allows an arbitrary grouping of persons which could be
    for example a subset of a pedigree or two unconnected pedigrees
    together.

    I'm not sure why this model is necessary but since Kintrak has a
    similar model, I will keep it.
    """
    members = models.ManyToManyField(Person, related_name="family_groups", through="FamilyMember")
    # members = models.ManyToManyField(Person, related_name="family_group")
    desc = models.CharField(max_length=1000, blank=True)

    _str_format = "Family {0}"
    _str_args = ("desc",)


class FamilyMember(BaseModel):
    """
    Denotes membership of an individual in a family group.
    """
    person = models.ForeignKey(Person, related_name="family_membership")
    family_group = models.ForeignKey(FamilyGroup)
    family_contact = models.BooleanField(default=False, help_text="This person is a suitable contact for the rest of the family")  # f285
    spokesperson = models.BooleanField(default=False, help_text="""
        The family member could be an appropriate lay spokesperson for
        the condition noted in the family. This is not the same as
        Family Contact?  This does not imply that the person has consented
        to being a spokesman, and specific consent must be sought in
        every instance and on each occasion.""")
    proband = models.BooleanField(default=False, help_text="Denotes the particular person being studied or reported on")
    # http://en.wikipedia.org/wiki/Proband

    _str_format = "{0} member {1}"
    _str_args = ("family_group", "person")


class Other(models.Model):
    """
    Other
    kintrak table: st_other
    """
    person = models.ForeignKey(Person)

    monkey = models.BooleanField(default=False)  # range [0, 1]

    main = models.IntegerField()  # range [-2, 171]
    nextother = models.IntegerField()  # range [0, 6]
    rtype = models.IntegerField()  # range [0, 8]
    index = models.IntegerField()  # range [1, 7]
    child = models.IntegerField()  # range [0, 239]

    cx1 = models.IntegerField()
    cx2 = models.IntegerField()
    cy1 = models.IntegerField()
    cy2 = models.IntegerField()
    sx1 = models.IntegerField()
    sx2 = models.IntegerField()
    sy1 = models.IntegerField()
    sy2 = models.IntegerField()
