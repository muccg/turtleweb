from ..project.models import Study
from ..events.models import EventType, Event
from ..biobank.models import Sample, Container, SampleCollection
from ..biobank.models import (
    SampleClass,
    SampleStoredIn,
    SampleTreatment,
    SampleBehaviour,
    DnaExtractionProtocol,
    SampleProcessed,
    SampleFrozenFixed,
    SampleLocation)
from ..people.models import Person
import random
from django.utils import timezone
from datetime import timedelta

deps = ["tennis"]


def load_data(**kwargs):
    study = Study.objects.get(slug="tennis")
    chaff_events(study)
    chaff_samples(study)

NUM_EVENTS = 10
NUM_SAMPLES = 30


def chaff_events(study):
    patients = Person.objects.filter(studies__study=study)
    for patient in patients:
        num = patient.event_set.filter(study=study).count()
        for i in range(num, NUM_EVENTS):
            dt = timezone.now() - timedelta(days=random.randrange(10000), seconds=random.randrange(3600 * 24))
            Event.objects.create(study=study, person=patient,
                                 date=dt,
                                 type=EventType.objects.first())


def chaff_samples(study):
    events = Event.objects.filter(study=study)
    for event in events:
        num = event.samplecollection_set.count()
        for i in range(num, NUM_SAMPLES):
            cls = SampleClass.objects.order_by("?").first()
            sample = Sample.objects.create(
                cls=cls,
                subtype=cls.samplesubtype_set.order_by("?").first(),
                stored_in=SampleStoredIn.objects.order_by("?").first(),
                treatment=SampleTreatment.objects.order_by("?").first(),
                behaviour=SampleBehaviour.objects.order_by("?").first(),
                dna_extraction_protocol=DnaExtractionProtocol.objects.order_by("?").first(),
                amount=random.random() * 10.0,
                location=random_location(),
            )
            date = timezone.now() - timedelta(days=random.randrange(1000))
            SampleCollection.objects.create(sample=sample, event=event, date=date)
            if random.random() > 0.3:
                SampleProcessed.objects.create(sample=sample, date=date + timedelta(hours=random.randrange(200)))
            if random.random() > 0.7:
                SampleFrozenFixed.objects.create(sample=sample, date=date + timedelta(hours=random.randrange(200)))


def random_location():
    box = Container.objects.filter(cls__name="Box").order_by("?").first()
    return SampleLocation.objects.create(container=box,
                                         x=random.randrange(box.width),
                                         y=random.randrange(box.height),
                                         z=0)
