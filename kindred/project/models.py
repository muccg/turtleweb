from django.db import models
from django.contrib.contenttypes.models import ContentType
from kindred.jsonb import JSONField
from reversion import revisions

from ..app.models import BaseModel, AbstractNameList, AbstractNameDescList
from ..users.models import User
from ..people.models import Person


class Study(AbstractNameDescList):
    """
    Study is a functional area of turtleweb. The study area
    corresponds to a category of ailment -- e.g. colorectal cancer,
    gynaecology, breast cancer.

    It's not a very good name, but that's what they were calling it in
    turtle. We should figure out a better name.

    Examples of studies:
     - CRC
     - Breast Cancer
     - WAGO (Gynae)
    """
    slug = models.SlugField(unique=True)
    archived = models.DateTimeField(blank=True, null=True, help_text="When non-None, the study is archived. Archiving hides the study away so it can be forgotten about")
    data = JSONField(null=True, blank=True, default={})

    class Meta(AbstractNameDescList.Meta):
        verbose_name_plural = "studies"

    @classmethod
    def get_for(cls, person):
        qs = Study.objects.filter(members__patient=person)
        return qs.order_by("members__consent_request_date", "slug").first()

    def num_consent(self):
        return self.members.filter(consents__status__name__iexact=ConsentStatus.CONSENTED).count()


@revisions.register
class StudyMember(BaseModel):
    """
    This is an association between people and studies.
    When a person is a member of a study they can be called a patient.
    """
    patient = models.ForeignKey(Person, related_name="studies")
    study = models.ForeignKey(Study, related_name="members")

    consent_request_date = models.DateTimeField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        unique_together = (("patient", "study"),)

    def __str__(self):
        return "Study %s member %s" % (self.study, self.patient)


class ConsentObtainedBy(AbstractNameList):
    pass


class ConsentStatus(AbstractNameList):
    CONSENTED = "Consented"


@revisions.register(follow=["study_member"])
class StudyConsent(models.Model):
    """
    Represents patient consent for their data to be kept in
    the system and used by the hospital.
    """
    study_member = models.ForeignKey(StudyMember, related_name="consents")
    status = models.ForeignKey(ConsentStatus)
    date = models.DateTimeField(null=True, blank=True, help_text="Date " +
                                "consent was given")
    consented_by = models.ForeignKey(ConsentObtainedBy, related_name="consents",
                                     null=True, blank=True)
    data = JSONField(null=True, blank=True)


@revisions.register
class Collaborator(BaseModel):
    first_name = models.CharField(max_length=200)
    last_name = models.CharField(max_length=200)
    title = models.ForeignKey("people.Title")
    contact = models.ForeignKey("contacts.ContactDetails")
    data = JSONField(null=True, blank=True)

    @property
    def full_name(self):
        return "%s, %s %s" % (self.last_name, self.title.name, self.first_name)

    def __str__(self):
        return self.full_name


@revisions.register
class StudyGroup(BaseModel):
    """
    A study group is a collection of patients used for organizing
    research, etc.
    It is like a patient list, cohort, etc
    """
    study = models.ForeignKey(Study)
    name = models.CharField(max_length=200)
    desc = models.TextField(blank=True)
    owner = models.ForeignKey(User, related_name="+")
    members = models.ManyToManyField(Person, related_name="study_groups",
                                     blank=True)
    collaborators = models.ManyToManyField(Collaborator,
                                           related_name="study_groups",
                                           blank=True)
    data = JSONField(null=True, blank=True)

    def __str__(self):
        return self.name


class PatientCase(AbstractNameList):
    """
    Patient Case is a classification of a patient into category of
    cancer.

    The case seems to correspond roughly with the site and diagnosis
    of the cancer, but isn't as exact.

    Example cases
     - Gynae
        - Benign
        - Non Gynae malignant
        - Ovary
        - Cervix
        - Corpus
        - Vulva
     - CRC
        - Benign
        - unknown
    """
    study = models.ForeignKey(Study)

    class Meta(AbstractNameList.Meta):
        unique_together = (("name", "study"),)


@revisions.register
class PatientHasCase(BaseModel):
    """
    This classifies patients into cases.

    The list of fields for an event depends upon which case(s) a
    patient belongs to.
    """

    study_member = models.ForeignKey(StudyMember)
    case = models.ForeignKey(PatientCase)

    class Meta(BaseModel.Meta):
        unique_together = (("study_member", "case"),)


@revisions.register
class CustomDataSchema(models.Model):
    """
    Allows definition of per-study JSON schema for the "data" field of
    various models.
    If study is null, then the schema applies to all studies.
    """
    content_type = models.ForeignKey(ContentType)
    study = models.ForeignKey(Study, null=True, blank=True)
    schema = JSONField(default={})

    class Meta(AbstractNameDescList.Meta):
        unique_together = [("content_type", "study")]
        ordering = ["content_type", "study"]

    def __str__(self):
        return "%s study=%s" % (self.content_type, self.study)

    @classmethod
    def get_field(cls, field_name, model_name, study_id=None):
        """
        Finds a schema property definition for a field of a model.
        The field definition specific to a study has precedence over
        the field definition for all studies.
        """
        def study_match(c):
            return c.study_id is None or c.study_id == study_id
        path = ["properties", field_name]
        cds = cls.objects.raw("""
            SELECT project_customdataschema.id, study_id, schema#>%s AS field
            FROM project_customdataschema
            INNER JOIN django_content_type
            ON project_customdataschema.content_type_id = django_content_type.id
            WHERE django_content_type.model = %s
            ORDER BY study_id DESC;
        """, [path, model_name])
        fields = [c.field for c in cds if c.field and study_match(c)]
        return fields[0] if len(fields) else None
