from django.db.models import Q

from tastypie import fields
import tastypie.constants

from ..biobank import models as biobank
from .base import register, accesslog, BaseResource, QueryResource
from ..query import sample_query_expr


@accesslog
@register
class ContainerClassResource(BaseResource):
    contained_by = fields.ForeignKey("self", "contained_by", null=True)

    class Meta(BaseResource.Meta):
        limit = 0
        max_limit = 0
        queryset = biobank.ContainerClass.objects.all()
        filtering = {
            "contained_by": tastypie.constants.ALL_WITH_RELATIONS,
        }


@accesslog
@register
class ContainerResource(BaseResource):
    cls = fields.ToOneField(ContainerClassResource, "cls", full=False)
    container = fields.ToOneField("self", "container", null=True, full=False)

    # these counts slow down the api ... but it's already quite slow
    num_samples = fields.IntegerField(readonly=True)
    # num_containers = fields.IntegerField(readonly=True)
    capacity = fields.IntegerField(readonly=True)
    samples = fields.ListField(readonly=True, use_in="detail")

    data = fields.DictField(attribute="data", blank=True, null=True)

    class Meta(BaseResource.Meta):
        limit = 0
        max_limit = 0
        queryset = biobank.Container.objects.all().select_related("cls", "container")
        filtering = {
            "cls": tastypie.constants.ALL,
            "container": tastypie.constants.ALL,
        }

    def full_dehydrate(self, bundle, for_list=False):
        # cache subcontainer ids at least
        bundle.container_ids = bundle.obj.get_subcontainer_ids()
        return super(ContainerResource, self).full_dehydrate(bundle, for_list)

    def _sub_locations(self, bundle):
        qs = biobank.SampleLocation.objects.all()
        return qs.filter(sample__isnull=False, container_id__in=bundle.container_ids)

    def dehydrate_num_samples(self, bundle):
        return self._sub_locations(bundle).count()

    def dehydrate_capacity(self, bundle):
        qs = biobank.Container.objects.filter(id__in=bundle.container_ids)
        qs = qs.extra(select={"capacity": "width * height * depth"})
        # return qs.aggregate(total=Sum("capacity"))["total"]
        return sum(qs.values_list("capacity", flat=True))

    def dehydrate_num_containers(self, bundle):
        return bundle.obj.containers.count()

    def dehydrate_samples(self, bundle):
        locs = bundle.obj.samplelocation_set.exclude(sample__isnull=True)
        return list(map(dict, locs.values("sample", "x", "y", "z")))


def containers_query(bundle):
    "Gets all parent containers"
    ids = biobank.Container.super_container_ids_for(bundle.obj.container_id)
    return biobank.Container.objects.filter(id__in=ids)


@accesslog
@register
class SampleLocationResource(BaseResource):
    container = fields.ForeignKey(ContainerResource, "container")

    containers = fields.ToManyField(ContainerResource, readonly=True,
                                    attribute=containers_query,
                                    use_in="detail", full=True)

    class Meta(BaseResource.Meta):
        queryset = biobank.SampleLocation.objects.all()
        filtering = {
            "container": tastypie.constants.ALL_WITH_RELATIONS,
        }


class BriefSampleLocationResource(BaseResource):
    container = fields.ForeignKey(ContainerResource, "container")

    class Meta(BaseResource.Meta):
        queryset = biobank.SampleLocation.objects.all()
        filtering = {
            "container": tastypie.constants.ALL_WITH_RELATIONS,
        }


@accesslog
@register
class SampleClassResource(BaseResource):
    unit_multiplier = fields.FloatField(attribute="get_unit_multiplier", readonly=True)

    class Meta(BaseResource.Meta):
        queryset = biobank.SampleClass.objects.all()
        filtering = {
            "name": tastypie.constants.ALL,
        }


@accesslog
@register
class SampleSubtypeResource(BaseResource):
    cls = fields.ForeignKey(SampleClassResource, "cls", full=True)

    class Meta(BaseResource.Meta):
        queryset = biobank.SampleSubtype.objects.all()
        filtering = {
            "name": tastypie.constants.ALL,
        }


@accesslog
@register
class SampleResource(QueryResource):
    cls = fields.ForeignKey(SampleClassResource, "cls", full=True)
    subtype = fields.ForeignKey(SampleSubtypeResource, "subtype", full=True)
    location = fields.ForeignKey(BriefSampleLocationResource, "location",
                                 null=True, full=True)
    stored_in = fields.ForeignKey("kindred.api.biobank.SampleStoredInResource",
                                  "stored_in", null=True, full=True)
    behaviour = fields.ForeignKey("kindred.api.biobank.SampleBehaviourResource",
                                  "behaviour", null=True, full=True)
    treatment = fields.ForeignKey("kindred.api.biobank.SampleTreatmentResource",
                                  "treatment", null=True, full=True)
    dna_extraction_protocol = fields.ForeignKey("kindred.api.biobank.DnaExtractionProtocolResource",
                                                "dna_extraction_protocol", null=True, full=True)
    transactions = fields.ToManyField("kindred.api.biobank.TransactionResource",
                                      "transactions", null=True, full=True)

    # fixme: may be slow
    owner = fields.ForeignKey("kindred.api.people.BriefPersonResource",
                              null=True, full=True, readonly=True,
                              full_list=True, full_detail=False,
                              attribute=lambda bundle: bundle.obj.get_owner())

    data = fields.DictField(attribute="data", blank=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = biobank.Sample.objects.order_by("id")
        filtering = {
            "location": tastypie.constants.ALL_WITH_RELATIONS,
            "transactions": tastypie.constants.ALL_WITH_RELATIONS,
        }
        ordering = [
            "id", "specimen_id", "location",
            "cls", "subtype",
            "stored_in", "treatment", "behaviour",
            "dna_extraction_protocol",
            "amount", "concentration",
            # fixme: results in duplicate records returned
            "transactions",
        ]

    def get_object_list(self, request):
        queryset = super(SampleResource, self).get_object_list(request)

        container = request.GET.get("container", "")
        self.setup_container_counts(request, queryset, container)

        return queryset

    def json_query(self, q):
        return sample_query_expr(q)

    def recursive_container_query(self, q):
        container_id = self._get_id(q)
        if container_id is None:
            return Q()
        # fixme: check whether this is too slow
        ids = biobank.Container.sub_container_ids_for(container_id)
        return Q(location__container__in=ids)

    custom_query_filters = {
        'container': recursive_container_query,
    }

    def alter_list_data_to_serialize(self, request, data):
        data["meta"]["container_counts"] = request.container_counts
        return data

    def setup_container_counts(self, request, samples, container):
        cs = self.get_container_counts(samples, container)
        request.container_counts = cs

    def get_container_counts(self, samples, container):
        container_id = self._get_id(container)
        container_ids = biobank.Container.visible_container_ids(container_id)

        # fixme: this is likely to become too slow
        def count(id):
            cs = biobank.Container.sub_container_ids_for(id)
            return samples.filter(location__container__in=cs).count()

        base = dict((id, count(id)) for id in container_ids)
        return base

    initial_extra_fields = ["event_type_id"]

    def _extra_field_event_type_id(self, obj, study_id=None):
        return obj.get_event_type_id()


class BaseTransactionResource(BaseResource):
    sample = fields.ForeignKey(SampleResource, "sample")
    data = fields.DictField(attribute="data", blank=True, null=True)

    class Meta(BaseResource.Meta):
        pass


@accesslog
@register
class SampleNoteResource(BaseTransactionResource):
    class Meta(BaseTransactionResource.Meta):
        queryset = biobank.Transaction.objects.filter(type="")


@accesslog
@register
class SampleCollectionResource(BaseTransactionResource):
    event = fields.ForeignKey("kindred.api.events.EventResource", "event")

    class Meta(BaseTransactionResource.Meta):
        queryset = biobank.SampleCollection.objects.all()
        filtering = {
            "event": tastypie.constants.ALL_WITH_RELATIONS,
        }


@accesslog
@register
class SampleUseResource(BaseTransactionResource):
    class Meta(BaseTransactionResource.Meta):
        queryset = biobank.SampleUse.objects.all()


@accesslog
@register
class SampleDestroyResource(BaseTransactionResource):
    last_location = fields.ForeignKey(SampleLocationResource, "last_location",
                                      full=True, null=True)

    class Meta(BaseTransactionResource.Meta):
        queryset = biobank.SampleDestroy.objects.all()


@accesslog
@register
class SampleSendingResource(BaseTransactionResource):
    last_location = fields.ForeignKey(SampleLocationResource, "last_location",
                                      full=True, null=True)

    class Meta(BaseTransactionResource.Meta):
        queryset = biobank.SampleSending.objects.all()


@accesslog
@register
class SampleSplitResource(BaseTransactionResource):
    class Meta(BaseTransactionResource.Meta):
        queryset = biobank.SampleSplit.objects.all()

    def hydrate(self, bundle):
        """
        Pops out the "extra_attrs" list from the request data and stashes
        it in an instance attribute of the bundle.

        This is used to fill new samples with a different sample class
        and subtype than the origin sample.
        """
        if "extra_attrs" in bundle.data:
            if isinstance(bundle.data["extra_attrs"], list):
                bundle.extra_attrs = bundle.data["extra_attrs"]
            del bundle.data["extra_attrs"]
        return bundle

    def obj_create(self, bundle, **kwargs):
        """
        If the bundle has extra_attrs, update the new samples with those
        attrs.
        """
        bundle = super().obj_create(bundle, **kwargs)
        if hasattr(bundle, "extra_attrs"):
            subdivs = biobank.SampleSubdivision.objects.filter(origin=bundle.obj).order_by("id")
            for extra, subdiv in zip(bundle.extra_attrs, subdivs):
                subdiv.sample.cls_id = extra["cls_id"] or subdiv.sample.cls_id
                subdiv.sample.subtype_id = extra["subtype_id"] or subdiv.sample.subtype_id
                subdiv.sample.save()
        return bundle


@accesslog
@register
class SampleSubdivisionResource(BaseTransactionResource):
    origin = fields.ForeignKey("kindred.api.biobank.TransactionResource", "origin")

    class Meta(BaseTransactionResource.Meta):
        queryset = biobank.SampleSubdivision.objects.all()
        filtering = {
            "origin": tastypie.constants.ALL,
        }


@accesslog
@register
class SampleSubculturedResource(BaseTransactionResource):
    class Meta(BaseTransactionResource.Meta):
        queryset = biobank.SampleSubcultured.objects.all()


@accesslog
@register
class SampleSubculturedFromResource(BaseTransactionResource):
    origin = fields.ForeignKey("kindred.api.biobank.TransactionResource", "origin")

    class Meta(BaseTransactionResource.Meta):
        queryset = biobank.SampleSubculturedFrom.objects.all()
        filtering = {
            "origin": tastypie.constants.ALL,
        }


@accesslog
@register
class SampleMoveResource(BaseTransactionResource):
    to = fields.ForeignKey(SampleLocationResource, "to",
                           full=True, null=True)
    fro = fields.ForeignKey(SampleLocationResource, "fro",
                            full=True, null=True)

    class Meta(BaseTransactionResource.Meta):
        queryset = biobank.SampleMove.objects.all()


@accesslog
@register
class SampleProcessedResource(BaseTransactionResource):
    class Meta(BaseTransactionResource.Meta):
        queryset = biobank.SampleProcessed.objects.all()


@accesslog
@register
class SampleAdjustmentResource(BaseTransactionResource):
    class Meta(BaseTransactionResource.Meta):
        queryset = biobank.SampleAdjustment.objects.all()


@accesslog
@register
class SampleFrozenFixedResource(BaseTransactionResource):
    class Meta(BaseTransactionResource.Meta):
        queryset = biobank.SampleFrozenFixed.objects.all()


@accesslog
@register
class TransactionResource(BaseResource):
    sample = fields.ForeignKey(SampleResource, "sample")
    samplecollection = fields.ForeignKey(SampleCollectionResource, "samplecollection", full=True, null=True)
    sampleuse = fields.ForeignKey(SampleUseResource, "sampleuse", full=True, null=True)
    sampledestroy = fields.ForeignKey(SampleDestroyResource, "sampledestroy", full=True, null=True)
    samplesending = fields.ForeignKey(SampleSendingResource, "samplesending", full=True, null=True)
    samplesplit = fields.ForeignKey(SampleSplitResource, "samplesplit", full=True, null=True)
    samplesubdivision = fields.ForeignKey(SampleSubdivisionResource, "samplesubdivision", full=True, null=True)
    samplesubcultured = fields.ForeignKey(SampleSubculturedResource, "samplesubcultured", full=True, null=True)
    samplesubculturedfrom = fields.ForeignKey(SampleSubculturedFromResource, "samplesubculturedfrom", full=True, null=True)
    samplemove = fields.ForeignKey(SampleMoveResource, "samplemove", full=True, null=True)
    sampleprocessed = fields.ForeignKey(SampleProcessedResource, "sampleprocessed", full=True, null=True)
    samplefrozenfixed = fields.ForeignKey(SampleFrozenFixedResource, "samplefrozenfixed", full=True, null=True)
    sampleadjustment = fields.ForeignKey(SampleAdjustmentResource, "sampleadjustment", full=True, null=True)
    data = fields.DictField(attribute="data", blank=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = biobank.Transaction.objects.all().select_related()
        filtering = {
            "sample": tastypie.constants.ALL_WITH_RELATIONS,
            "samplecollection": tastypie.constants.ALL_WITH_RELATIONS,
            "sampleuse": tastypie.constants.ALL_WITH_RELATIONS,
            "sampledestroy": tastypie.constants.ALL_WITH_RELATIONS,
            "samplesending": tastypie.constants.ALL_WITH_RELATIONS,
            "samplesplit": tastypie.constants.ALL_WITH_RELATIONS,
            "samplesubdivision": tastypie.constants.ALL_WITH_RELATIONS,
            "samplesubcultured": tastypie.constants.ALL_WITH_RELATIONS,
            "samplesubculturedfrom": tastypie.constants.ALL_WITH_RELATIONS,
            "samplemove": tastypie.constants.ALL_WITH_RELATIONS,
            "sampleprocessed": tastypie.constants.ALL_WITH_RELATIONS,
            "samplefrozenfixed": tastypie.constants.ALL_WITH_RELATIONS,
            "sampleadjustment": tastypie.constants.ALL_WITH_RELATIONS,
        }
