import logging

from tastypie import fields
import tastypie.constants

from ..reports import models as reports
from .base import register, accesslog, BaseResource

logger = logging.getLogger(__name__)


class SpaceListField(fields.ApiField):
    """
    Converts space-separated text into a json array and back.
    """
    def convert(self, value):
        if value is None:
            return None
        return value.split()

    def hydrate(self, bundle):
        value = super(SpaceListField, self).hydrate(bundle) or []

        if isinstance(value, list):
            value = " ".join(value)

        return value


class JSONField(fields.ApiField):
    """
    A field of any type.
    """
    dehydrated_type = 'object'
    help_text = ""

    def convert(self, value):
        return value


@accesslog
@register
class SearchResource(BaseResource):
    study = fields.ToOneField("kindred.api.project.StudyResource", "study", null=True)
    owner = fields.ToOneField("kindred.api.users.UserResource", "owner")
    query = JSONField(attribute="query", null=True)
    order_by = SpaceListField(attribute="order_by")
    list_columns = SpaceListField(attribute="list_columns")

    class Meta(BaseResource.Meta):
        queryset = reports.Search.objects.all()
        ordering = ["id"]
        filtering = {
            "study": tastypie.constants.ALL,
            "owner": tastypie.constants.ALL,
            "name": tastypie.constants.ALL,
        }


@accesslog
@register
class ReportResource(BaseResource):
    study = fields.ToOneField("kindred.api.project.StudyResource", "study")
    owner = fields.ToOneField("kindred.api.users.UserResource", "owner")
    query = JSONField(attribute="query", blank=True, null=True)
    order_by = SpaceListField(attribute="order_by")
    list_columns = SpaceListField(attribute="list_columns")
    group_by = SpaceListField(attribute="group_by")
    count = fields.IntegerField(readonly=True, use_in="detail")
    result = fields.ListField(readonly=True, use_in="detail")

    class Meta(BaseResource.Meta):
        queryset = reports.Report.objects.all()
        ordering = ["id"]
        filtering = {
            "study": tastypie.constants.ALL,
            "owner": tastypie.constants.ALL,
        }

    def dehydrate_count(self, bundle):
        qs = bundle.obj.get_qs()
        return qs.count()

    def dehydrate_result(self, bundle):
        return bundle.obj.get_groups()


@register
class ReportFrontPageResource(BaseResource):
    report = fields.ToOneField("kindred.api.reports.ReportResource", "report", full=True)
    count = fields.IntegerField(readonly=True)

    class Meta(BaseResource.Meta):
        queryset = reports.ReportFrontPage.objects.select_related("report").order_by("order")
        ordering = ["order"]
        filtering = {
            "report": tastypie.constants.ALL_WITH_RELATIONS,
        }

    def dehydrate_count(self, bundle):
        qs = bundle.obj.report.get_qs()
        return qs.count()
