from tastypie import fields

from ..audit import models as audit
from .base import register, BaseResource
from .people import PersonResource


@register
class AuditGroupMemberResource(BaseResource):
    person = fields.ForeignKey(PersonResource, "person", full=True)
    confidence = fields.IntegerField("confidence")

    class Meta(BaseResource.Meta):
        queryset = audit.AuditGroupMember.objects.all().select_related("matching_with").order_by('-confidence')


@register
class AuditGroupResource(BaseResource):
    matching_with = fields.ForeignKey(PersonResource, "matching_with", full=True)
    members = fields.ToManyField(AuditGroupMemberResource, "members", full=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = audit.AuditGroup.objects.all().select_related("matching_with").order_by('-confidence')
