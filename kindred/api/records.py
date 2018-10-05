from tastypie import fields
import tastypie.constants

from ..records import models as records
from .base import register, accesslog, BaseResource


@accesslog
@register
class FileAttachmentResource(BaseResource):
    creator = fields.ForeignKey("kindred.api.users.BriefUserResource", "creator", full=True)
    url = fields.CharField(readonly=True)
    content_type = fields.CharField(readonly=True)

    class Meta(BaseResource.Meta):
        queryset = records.FileAttachment.objects.all()
        filtering = {
            "creator": tastypie.constants.ALL,
        }

    def build_filters(self, filters=None):
        if filters is None:
            filters = {}
        orm_filters = super(FileAttachmentResource, self).build_filters(filters)

        resource_uri = filters.get("item", "")
        if resource_uri:
            from . import parse_resource_uri
            content_type, pk = parse_resource_uri(resource_uri)
            if content_type and pk:
                orm_filters["content_type_id"] = content_type.id
                orm_filters["object_id"] = pk

        return orm_filters

    def dehydrate_content_type(self, bundle):
        return str(bundle.obj.content_type)

    def dehydrate_url(self, bundle):
        return bundle.obj.get_absolute_url()
