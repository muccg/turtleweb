from django.db import models
from reversion import revisions
from kindred.jsonb import JSONField

from ..app.models import AuditAndPrivacy, AbstractNameDescList, BaseModel
from ..people.models import Person
from ..sp.models import Doctor
from ..events.models import Event
from ..project.models import Study


class Intervention(AbstractNameDescList):
    """
    An intervention the description of a drug, drug combination,
    treatment, etc, that can be given to patients.

    The categorization a treatments is fairly broad which is good
    enough for research purposes, but not detailed and exact enough
    for e.g. clinical trials.
    """
    super_type = models.ForeignKey("self", null=True, blank=True)

    group = models.CharField(max_length=250, help_text="Intervention category")
    abbr_name = models.CharField(max_length=100)
    alternative_name = models.CharField(max_length=250, help_text="Drugs/treatments can go under multiple names")
    comments = models.TextField(max_length=1000, blank=True)
    units = models.CharField(max_length=100, blank=True, help_text="Units of treatment grey/mg/mL/litres/pints/etc")
    route = models.CharField(max_length=250, blank=True,
                             verbose_name="Route of administration",
                             help_text="How the intervention is delivered to the patient (injection/radiation beam/oral/etc)")

    fields = JSONField(null=True, blank=True)
    studies = models.ManyToManyField(Study, related_name="interventions", blank=True,
                                     help_text="Studies which this intervention applies to." +
                                     " If blank, intervention applies to all studies.")

    class Meta(AbstractNameDescList.Meta):
        unique_together = [("super_type", "name")]


@revisions.register
class Treatment(AuditAndPrivacy, BaseModel):
    """
    Treatment is a simple list of interventions which have been or are
    being given to the patient.
    """
    person = models.ForeignKey(Person, related_name="treatments")
    intervention = models.ForeignKey(Intervention, on_delete=models.PROTECT)

    # Not sure what event is for
    event = models.ForeignKey(Event, null=True, blank=True)
    # diagnosis = models.ForeignKey(Diagnosis)

    comments = models.TextField(max_length=2000, blank=True)
    cycles = models.IntegerField(null=True)
    doctor = models.ForeignKey(Doctor, null=True, blank=True,
                               help_text="Doctor for tx")
    dose = models.FloatField(null=True, help_text="Dose of treatment")
    start_date = models.DateField(null=True, blank=True)
    stop_date = models.DateField(null=True, blank=True)
    stop_reason = models.CharField(max_length=500)

    data = JSONField(null=True, blank=True)
