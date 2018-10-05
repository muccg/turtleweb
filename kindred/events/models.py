from django.db import models
from kindred.jsonb import JSONField
from reversion import revisions

from ..app.models import BaseModel, AbstractNameList
from ..app.utils import init_record_id
from ..biobank.models import Sample
from ..project.models import Study
from ..people.models import Person


class EventType(AbstractNameList):
    super_type = models.ForeignKey("self", null=True, blank=True)
    fields = JSONField(null=True, blank=True)
    studies = models.ManyToManyField(Study, related_name="event_types", blank=True,
                                     help_text="Studies which this event type applies to." +
                                     " If blank, event type applies to all studies.")

    class Meta(AbstractNameList.Meta):
        unique_together = [("super_type", "name")]


@revisions.register
class Event(BaseModel):
    ident = models.CharField(max_length=30, default="", unique=True)
    type = models.ForeignKey(EventType, on_delete=models.PROTECT)
    person = models.ForeignKey(Person)
    date = models.DateTimeField(null=True, blank=True)
    samples = models.ManyToManyField(Sample, blank=True,
                                     help_text="Samples resulting from event")  # fixme: remove
    study = models.ForeignKey(Study, help_text="Designates which study \"owns\" the samples")
    data = JSONField(null=True, blank=True, help_text="Fields as defined by the event type")

    @staticmethod
    def make_id(id):
        return "E-%06d" % id

    @init_record_id("ident")
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def get_merged_schema(self):
        schemas = []
        et = self.type
        while et:
            schemas.append(et.fields)
            # fixme: use a single query
            et = et.super_type

        merged = {}
        for schema in reversed(schemas):
            merged.update(schema.get("properties") or {})

        return {"properties": merged}
