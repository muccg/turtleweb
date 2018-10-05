from django.db import models
from django.utils import timezone
from kindred.jsonb import JSONField
from reversion import revisions

from ..app.models import AbstractNameList
from ..app.utils import init_record_id
from ..people.models import Person


# The inventory system as it currently works, allocates a biospecimen
# to a box coordinate in a box, in a rack, on a shelf, in a freezer in
# a location.
#
# The inventory system accessible across all studies, they all use the
# same module so there is no double up in box numbers etc.
#
# The freezer is managed, inventory wise, as a whole fridge, not
# divided by study.
#
# The inventory module must enable users to be able to add freezers,
# shelves, racks and boxes.  There must be enough flexibility to have
# different sized boxes (eg 10x10, 9x9, 5 x5).

class ContainerClass(models.Model):
    """
    This model defines the hierarchy structure. The class of a
    container could be something like shelf or box. The contained_by
    relation determines which containers can go into which.
    """
    name = models.CharField(max_length=250)
    contained_by = models.ForeignKey("ContainerClass", null=True, blank=True)
    dim = models.PositiveIntegerField(default=1, verbose_name="dimension")
    def_width = models.IntegerField(default=1, verbose_name="default width")
    def_height = models.IntegerField(default=1, verbose_name="default height")
    def_depth = models.IntegerField(default=1, verbose_name="default depth")
    coord = models.CharField(max_length=3, verbose_name="co-ordinates",
                             default="1A0",
                             help_text="Co-ordinate type (numeric/alphabetical) for each dimension")

    def __str__(self):
        return self.name

    def fmt_coord(self, x, y, z):
        parts = list(zip(self.coord, [x, y, z]))[:self.dim]
        sep = "," if self.coord.isalpha() or self.coord.isdigit() else ""
        return sep.join(chr(ord(c) + n) for (c, n) in reversed(parts))


class Container(models.Model):
    """
    A container is something which goes inside other containers and/or
    can contain samples.

    Depending upon the dimension of its class, the product of width,
    height, and depth determines how many samples can be held within
    the container.
    """
    cls = models.ForeignKey(ContainerClass, related_name="containers")
    name = models.CharField(max_length=250)
    order = models.PositiveIntegerField(default=0)
    default = models.BooleanField(default=False)
    container = models.ForeignKey("Container", null=True, blank=True,
                                  related_name="containers")
    width = models.IntegerField(default=0)
    height = models.IntegerField(default=0)
    depth = models.IntegerField(default=0)

    data = JSONField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if self.cls:
            self.width = self.width if self.width else self.cls.def_width
            self.height = self.height if self.height else self.cls.def_height
            self.depth = self.depth if self.depth else self.cls.def_depth
        super(Container, self).save(*args, **kwargs)

    class Meta:
        ordering = ["container_id", "order"]

    def __str__(self):
        return self.name

    def get_subcontainer_ids(self):
        """
        Return list of ids of all subcontainers.
        """
        return type(self).sub_container_ids_for(self.id)

    @classmethod
    def sub_container_ids_for(cls, container_id):
        qs = cls.objects.raw("""
                 WITH RECURSIVE
                                  q AS (
                                  SELECT p.*, 0 AS level
                                  FROM biobank_container p
                                  WHERE id = %s
                                  UNION ALL
                                  SELECT pc.*, level + 1
                                  FROM q
                                  JOIN biobank_container pc
                                  ON (pc.container_id = q.id)
                                  )
                             SELECT id
                             FROM q
                             ORDER BY level DESC
                 """, [container_id])
        return [c.id for c in qs]

    @classmethod
    def super_container_ids_for(cls, container_id):
        qs = cls.objects.raw("""
                 WITH RECURSIVE
                                  q AS (
                                  SELECT p.*, 0 AS level
                                  FROM biobank_container p
                                  WHERE id = %s
                                  UNION ALL
                                  SELECT pc.*, level + 1
                                  FROM q
                                  JOIN biobank_container pc
                                  ON (pc.id = q.container_id)
                                  )
                             SELECT id
                             FROM q
                             ORDER BY level DESC
                 """, [container_id])
        return [c.id for c in qs]

    @classmethod
    def visible_container_ids(cls, container_id):
        """
        Gets all the containers which would be visible if a container were
        selected in the biobank hierarchy.
        """
        # fixme: query isn't right ... need to select "aunty and
        # uncle" containers as well
        qs = cls.objects.raw("""
                 (WITH RECURSIVE
                          q AS (
                          SELECT p.*, 0 AS level
                          FROM biobank_container p
                          WHERE id = %s
                          UNION ALL
                          SELECT pc.*, level + 1
                          FROM q
                          JOIN biobank_container pc
                          ON (pc.id = q.container_id)
                          )
                     SELECT id
                     FROM q
                     ORDER BY level DESC)
                 UNION
                 SELECT id FROM biobank_container
                 WHERE container_id = %s
                 UNION
                 SELECT id FROM biobank_container
                 WHERE container_id IS NULL
                 """, [container_id, container_id])
        return [c.id for c in qs]

    def num_samples(self):
        cs = self.get_subcontainer_ids()
        return Sample.objects.filter(location__container__in=cs).count()

    def get_path(self):
        ids = self.super_container_ids_for(self.id)
        names = dict(type(self).objects.filter(id__in=ids).values_list("id", "name"))
        return [names[id] for id in ids]


@revisions.register
class SampleLocation(models.Model):
    """
    A grid address of a sample within a container.
    """
    container = models.ForeignKey(Container)
    x = models.IntegerField(default=0)
    y = models.IntegerField(default=0)
    z = models.IntegerField(default=0)

    def __str__(self):
        return " / ".join(self.container.get_path() + [self.fmt_coord()])

    def fmt_coord(self):
        return self.container.cls.fmt_coord(self.x, self.y, self.z)


UNIT_CHOICES = (("m", "Mass"),
                ("v", "Volume"),
                ("p", "Pieces"))

DISPLAY_UNIT_CHOICES = (
    ("kg", "Kilograms"),
    ("g", "Grams"),
    ("mg", "Milligrams"),
    ("µg", "Micrograms"),
    ("L", "Litres"),
    ("mL", "Millilitres"),
    ("µL", "Microlitres"),
    ("pcs", "Pieces"),
    ("vials", "Vials"),
)

UNIT_MULTIPLIERS = (
    ("kg", 1e3),
    ("g", 1),
    ("mg", 1e-3),
    ("µg", 1e-6),
    ("L", 1),
    ("mL", 1e-3),
    ("µL", 1e-6),
    ("pcs", 1),
    ("vials", 1),
)


@revisions.register
class SampleClass(AbstractNameList):
    """
    Nature of sample - Tissue/Blood/Nucleic Acid
    possibly add urine and other things although these aren't used.
    """
    unit = models.CharField(max_length=1, choices=UNIT_CHOICES, blank=True)
    display_unit = models.CharField(max_length=10, choices=DISPLAY_UNIT_CHOICES,
                                    blank=True)

    def get_unit_multiplier(self):
        return dict(UNIT_MULTIPLIERS).get(self.display_unit, 1)


@revisions.register
class SampleSubtype(AbstractNameList):
    """
    For tissue, subtype is a body part. This could be quite specific, e.g. upper/lower colon,
    various names for parts of colon.
    For blood, it's something like plasma/buffy coat.
    For nucleic acid its ... i forget.
    """
    cls = models.ForeignKey(SampleClass)

    class Meta(AbstractNameList.Meta):
        unique_together = (("cls", "name"),)


@revisions.register
class SampleStoredIn(AbstractNameList):
    """
    How it's stored, e.g. Parafin block, blood tube, 96 well plate, etc.
    """


@revisions.register
class SampleBehaviour(AbstractNameList):
    """
    Behaviour - Normal, Malignant, Benign (about 8 categories in
    general). Only applies to tissue samples.
    """


@revisions.register
class SampleTreatment(AbstractNameList):
    """
    Frozen, Formalin Fixed, other fixatives possible too.
    """


@revisions.register
class DnaExtractionProtocol(AbstractNameList):
    """
    Extraction protocol. Only applies to DNA.
    """


@revisions.register(follow=["location"])
class Sample(models.Model):
    cls = models.ForeignKey(SampleClass, related_name="+",
                            on_delete=models.PROTECT)
    subtype = models.ForeignKey(SampleSubtype, on_delete=models.PROTECT)

    specimen_id = models.CharField(max_length=30, unique=True, db_index=True)

    location = models.ForeignKey(SampleLocation, null=True, blank=True,
                                 on_delete=models.SET_NULL,
                                 related_name="sample")

    stored_in = models.ForeignKey(SampleStoredIn, on_delete=models.PROTECT)

    treatment = models.ForeignKey(SampleTreatment, null=True, blank=True,
                                  on_delete=models.SET_NULL)

    # Behaviour applies to tissue only
    behaviour = models.ForeignKey(SampleBehaviour, null=True, blank=True,
                                  on_delete=models.SET_NULL)

    # extraction protocol applies to dna only
    dna_extraction_protocol = models.ForeignKey(DnaExtractionProtocol,
                                                null=True, blank=True,
                                                on_delete=models.SET_NULL)

    amount = models.FloatField(help_text="Quantity of sample in units",
                               default=0.0)
    display_unit = models.CharField(max_length=10, choices=DISPLAY_UNIT_CHOICES,
                                    blank=True)

    concentration = models.FloatField(default=1.0, help_text="Concentration of DNA, in ng/µL")

    comments = models.TextField(max_length=1000)
    data = JSONField(null=True, blank=True)

    def format_id(self):
        return self.specimen_id or self.make_id(self.id)

    @staticmethod
    def make_id(id):
        return "B-%07d" % id

    def make_derived_sample(self, sample_attrs, xact_attrs):
        "make a derive sample, and note this in the transaction log"
        s = Sample(cls=self.cls,
                   subtype=self.subtype,
                   display_unit=self.display_unit,
                   location=None,
                   stored_in=self.stored_in,
                   treatment=self.treatment,
                   behaviour=self.behaviour,
                   concentration=self.concentration,
                   comments=self.comments,
                   data=self.data,
                   **sample_attrs)
        s.save()
        xact = self.transactions.order_by("pk")
        event_id = xact.values_list("samplecollection__event", flat=True).first()
        if event_id:
            t = SampleCollection(sample=s, event_id=event_id, **xact_attrs)
            t.save()
        return s

    def destroy_if_consumed(self, **attrs):
        if self.amount <= 0.0:
            d = SampleDestroy(sample=self, **attrs)
            d.save()

    @init_record_id("specimen_id")
    def save(self, *args, **kwargs):
        if not self.display_unit and self.cls:
            self.display_unit = self.cls.display_unit
        super().save(*args, **kwargs)

    def get_owner(self):
        ids = self.transactions.values_list("samplecollection__event__person")
        return Person.objects.filter(id__in=ids).first()

    def get_event_type_id(self):
        lookup = "samplecollection__event__type_id"
        return self.transactions.values_list(lookup, flat=True).first()

    def __str__(self):
        return self.specimen_id


class Transaction(models.Model):
    sample = models.ForeignKey(Sample, related_name="transactions")
    date = models.DateTimeField(default=timezone.now, null=True)
    comment = models.TextField()
    data = JSONField(null=True, blank=True)

    class Meta:
        ordering = ["sample_id", "date", "id"]
        get_latest_by = "date"

    # Unfortunately Django requires a lot of futzing around to get
    # nice non-abstract model inheritance.

    TYPE_CHOICES = (("C", "Collection"), ("U", "Use"), ("D", "Destruction"),
                    ("X", "Sending"), ("A", "Split"), ("S", "Subdivision"),
                    ("P", "Processed"), ("F", "Frozen/Fixed"),
                    ("J", "Subcultured"), ("K", "Subcultured from"),
                    ("L", "Adjustment"), ("", "Note"))
    type = models.CharField(max_length=1, choices=TYPE_CHOICES, default="")

    SUBCLS_MAP = {"C": "SampleCollection", "U": "SampleUse", "D": "SampleDestroy",
                  "X": "SampleSending", "M": "SampleMove",
                  "A": "SampleSplit", "S": "SampleSubdivision",
                  "P": "SampleProcessed", "F": "SampleFrozenFixed",
                  "J": "SampleSubcultured", "K": "SampleSubculturedFrom",
                  "L": "SampleAdjustment", "": "Transaction"}

    @property
    def ext(self):
        if self.type:
            return getattr(self, self.SUBCLS_MAP[self.type].lower())
        else:
            return self

    def save(self, *args, **kwargs):
        if not self.type:
            inv_map = dict((v, k) for k, v in self.SUBCLS_MAP.items())
            self.type = inv_map.get(type(self).__name__, "")

        # apply_transaction implementations may need to create foreign-key
        # relationships pointing at this transaction, so save() before calling
        will_apply = self.pk is None
        result = super().save(*args, **kwargs)
        if will_apply:
            self.apply_transaction()
        return result

    def apply_transaction(self):
        pass

    def destroy_sample_if_consumed(self):
        self.sample.destroy_if_consumed(date=self.date, comment=self.comment, data=self.data)

    def __str__(self):
        return "%s %s %s" % (self.SUBCLS_MAP[self.type], self.date, self.comment)


class SampleCollection(Transaction):
    """
    Links a sample to an event.
    """
    event = models.ForeignKey("events.Event", on_delete=models.CASCADE)


class SampleAdjustment(Transaction):
    """
    Records an adjustment to the amount of a sample held in storage.
    """
    amount = models.FloatField(default=0.0)

    def apply_transaction(self):
        self.sample.amount = self.amount
        self.sample.save()
        self.destroy_sample_if_consumed()


class SampleUse(Transaction):
    """
    Records removal of a portion of a sample for use, or the
    destruction of the sample.
    """
    amount = models.FloatField(default=0.0)

    def apply_transaction(self):
        self.sample.amount -= self.amount
        self.sample.save()
        self.destroy_sample_if_consumed()


class SampleDestroy(Transaction):
    """
    Records destruction of a sample.
    """
    last_location = models.ForeignKey(SampleLocation, null=True, blank=True,
                                      related_name="+")

    def apply_transaction(self):
        self.last_location = self.sample.location
        self.sample.location = None
        self.sample.amount = 0
        self.sample.save()


class SampleSending(Transaction):
    """
    Delivery of sample to a collaborator.
    """
    amount = models.FloatField(default=0.0)
    collaborator = models.CharField(max_length=200)
    address = models.TextField()
    last_location = models.ForeignKey(SampleLocation, null=True, blank=True,
                                      related_name="+")

    def apply_transaction(self):
        self.last_location = self.sample.location
        self.sample.location = None
        self.sample.amount -= min(self.amount, self.sample.amount)

        self.sample.save()


class SampleSplit(Transaction):
    """
    Records that a sample was split into a number of other samples.
    """
    count = models.PositiveIntegerField()
    total_amount = models.FloatField()

    def apply_transaction(self):
        amount = self.total_amount / self.count if self.count else 0.0

        def make_subdivision(sample, index):
            t = SampleSubdivision(sample=sample, date=self.date,
                                  comment=self.comment, data=self.data,
                                  number=index, count=self.count,
                                  amount=sample.amount, origin=self)
            t.save()
            return t

        samples = [
            self.sample.make_derived_sample(
                {
                    'amount': amount
                },
                {
                    'date': self.date,
                    'comment': self.comment,
                    'data': self.data
                })
            for i in range(self.count)]
        [make_subdivision(sample, i) for (i, sample) in enumerate(samples)]
        self.sample.amount -= self.total_amount
        self.sample.save()
        self.destroy_sample_if_consumed()


class SampleSubdivision(Transaction):
    """
    Records creation of sample by subdivision from another sample.
    """
    number = models.PositiveIntegerField()
    count = models.PositiveIntegerField()
    amount = models.FloatField()
    origin = models.ForeignKey(Transaction, related_name='split')


class SampleSubcultured(Transaction):
    """
    Records that a sample was used to create new samples via subculture.
    Consumes a number of units of the original sample.
    Creates a number of new samples of a new sample, derived from this sample.

    consumed_amount: the units consumed_amount from source sample
    created_count: the number of new samples created
    created_amount: the size of each new sample
    """

    consumed_amount = models.FloatField()
    created_count = models.IntegerField()
    created_amount = models.FloatField()

    def apply_transaction(self):

        def make_culture_from(sample, index):
            t = SampleSubculturedFrom(sample=sample, date=self.date,
                                      comment=self.comment, data=self.data,
                                      number=index, count=self.created_count,
                                      amount=sample.amount, origin=self)
            t.save()
            return t

        samples = [
            self.sample.make_derived_sample(
                {
                    'amount': self.created_amount
                },
                {
                    'date': self.date,
                    'comment': self.comment,
                    'data': self.data
                })
            for i in range(self.created_count)]
        [make_culture_from(sample, i) for (i, sample) in enumerate(samples)]
        self.sample.amount -= self.consumed_amount
        self.sample.save()
        self.destroy_sample_if_consumed()


class SampleSubculturedFrom(Transaction):
    """
    Records creation of sample by culture from another sample.
    """
    number = models.PositiveIntegerField()
    count = models.PositiveIntegerField()
    amount = models.FloatField()
    origin = models.ForeignKey(Transaction, related_name='subcultured')


class SampleMove(Transaction):
    """
    Records movement of sample from one location to another.
    """
    to = models.ForeignKey(SampleLocation, null=True, blank=True,
                           related_name="+")
    fro = models.ForeignKey(SampleLocation, verbose_name="from",
                            null=True, blank=True, related_name="+")

    def apply_transaction(self):
        self.fro = self.sample.location
        self.sample.location = self.to
        self.sample.save()


class SampleProcessed(Transaction):
    """
    Processing happens after the sample is collected.
    """
    pass


class SampleFrozenFixed(Transaction):
    """
    The sample is treated for storage.
    """
    pass
