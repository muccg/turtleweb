from django.db.models import Q

import tastypie.constants

from ..diagnosis import models as diagnosis
from .base import register, BaseResource


@register
class DiagnosisIndexResource(BaseResource):

    class Meta(BaseResource.Meta):
        queryset = diagnosis.DiagnosisIndex.objects.all()
        filtering = {
            "name": tastypie.constants.ALL,
        }
        ordering = ["order"],
        max_limit = 0

    def build_filters(self, filters=None):
        if filters is None:
            filters = {}

        orm_filters = super(DiagnosisIndexResource, self).build_filters(filters)

        q = filters.get("q", "")
        if q:
            qo = (Q(name__istartswith=q))
            pks = self.Meta.queryset.filter(qo).values_list("id", flat=True)
            orm_filters["pk__in"] = pks

        return orm_filters
