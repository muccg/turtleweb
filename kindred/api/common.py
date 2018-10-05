from django.contrib.contenttypes.models import ContentType
import tastypie
from .base import BaseResource


class ContentTypeResource(BaseResource):
    class Meta(BaseResource.Meta):
        queryset = ContentType.objects.all()
        filtering = {
            "app_label": tastypie.constants.ALL,
            "model": tastypie.constants.ALL,
        }
