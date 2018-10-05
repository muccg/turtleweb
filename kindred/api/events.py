import logging

import tastypie.constants
from tastypie import fields

from ..events import models as events
from .base import register, BaseResource, QueryResource
from ..query import event_query_expr

logger = logging.getLogger(__name__)


@register
class EventTypeResource(BaseResource):
    super_type = fields.ToOneField("kindred.api.events.EventTypeResource",
                                   "super_type", null=True, full=False)
    studies = fields.ToManyField("kindred.api.project.StudyResource", "studies",
                                 null=True, full=False)
    fields = fields.DictField(attribute="fields", blank=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = events.EventType.objects.all()


@register
class EventResource(QueryResource):
    type = fields.ToOneField("kindred.api.events.EventTypeResource", "type", full=True)
    person = fields.ToOneField("kindred.api.people.BriefPersonResource", "person", full=True, full_detail=False)
    samples = fields.ToManyField("kindred.api.biobank.SampleResource", "samples",
                                 null=True, full=False)
    study = fields.ToOneField("kindred.api.project.StudyResource", "study")
    data = fields.DictField(attribute="data", blank=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = events.Event.objects.order_by("id").select_related("person", "type")
        filtering = {
            "person": tastypie.constants.ALL,
            "study": tastypie.constants.ALL,
        }
        ordering = ["id", "ident", "type", "person", "study", "date"]

    def json_query(self, q):
        return event_query_expr(q)

    def get_data_schema(self, obj):
        return obj.get_merged_schema()
