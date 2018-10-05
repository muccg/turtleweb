import tastypie
from tastypie import fields

from .base import register, BaseResource
from ..app.models import MigrationRun, CustomDropDownList, CustomDropDownValue


@register
class MigrationRunResource(BaseResource):
    report = fields.DictField(attribute="report")

    class Meta(BaseResource.Meta):
        queryset = MigrationRun.objects.order_by("start_time")


@register
class CustomDropDownListResource(BaseResource):
    num_items = fields.IntegerField(readonly=True)
    default = fields.CharField(readonly=True)

    class Meta(BaseResource.Meta):
        queryset = CustomDropDownList.objects.all()
        resource_name = "ddl"
        filtering = {
            "name": tastypie.constants.ALL,
        }

    def dehydrate_num_items(self, bundle):
        return bundle.obj.items.count()

    def dehydrate_default(self, bundle):
        default = bundle.obj.items.filter(default=True)
        return default.values_list("name", flat=True).first()


@register
class CustomDropDownValueResource(BaseResource):
    list = fields.ForeignKey(CustomDropDownListResource, "list")

    class Meta(BaseResource.Meta):
        queryset = CustomDropDownValue.objects.all()
        resource_name = "ddv"
        filtering = {
            "name": tastypie.constants.ALL,
            "list": tastypie.constants.ALL_WITH_RELATIONS,
        }
