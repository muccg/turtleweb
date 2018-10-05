from tastypie import fields

from ..prenatal import models as prenatal
from .base import register, accesslog
from .people import PersonResource


@accesslog
@register
class FoetusResource(PersonResource):
    mother = fields.ForeignKey(PersonResource, "mother", full=True)
    father = fields.ForeignKey(PersonResource, "father", full=True)

    class Meta(PersonResource.Meta):
        queryset = prenatal.Foetus.objects.all()
