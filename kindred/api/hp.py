from tastypie import fields
import tastypie.constants
from hippo.hp import models as hp
from .base import register, BaseResource, make_generic_resource
from ..hprel import models as hprel


PhenotypeSynonymResource = make_generic_resource(hp.PhenotypeSynonym)


@register
class PhenotypeResource(BaseResource):
    synonyms = fields.ToManyField("kindred.api.hp.PhenotypeSynonymResource",
                                  "synonyms", full=True, null=True)
    superclasses = fields.ToManyField("kindred.api.hp.PhenotypeSuperclassResource",
                                      "superclasses", full=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = hp.Phenotype.objects.all()
        filtering = {
            "code": tastypie.constants.ALL,
            "label": tastypie.constants.ALL,
        }


@register
class PhenotypeSuperclassResource(BaseResource):
    parent = fields.ForeignKey("kindred.api.hp.PhenotypeResource", "parent")

    class Meta(BaseResource.Meta):
        queryset = hp.PhenotypeSubclass.objects.all()


@register
class HasFeatureResource(BaseResource):
    person = fields.ForeignKey("kindred.api.people.PersonResource", "person")
    phenotype = fields.ForeignKey(PhenotypeResource, "phenotype", full=True)
    status = fields.BooleanField("status", null=True)

    class Meta(BaseResource.Meta):
        queryset = hprel.HasFeature.objects.all()
        filtering = {
            "phenotype": tastypie.constants.ALL_WITH_RELATIONS,
            "person": tastypie.constants.ALL,
        }
