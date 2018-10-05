from django.contrib.contenttypes.models import ContentType

from ..project.models import CustomDataSchema
from migrate.util import dictmerge

__all__ = ["load_simple_name_list", "load_simple_csv", "load_custom_schemas", "dictmerge"]


def simple_name_list(string):
    for x in enumerate(filter(bool, map(str.strip, string.split("\n")))):
        yield x


def load_simple_name_list(modelcls, string):
    for i, name in simple_name_list(string):
        modelcls.objects.get_or_create(name=name, defaults={"order": i + 1})


def load_simple_csv(model, csv_text):
    csv = list(filter(bool, map(str.strip, csv_text.split("\n"))))
    fields = csv[0].split(",")

    for i, row in enumerate(csv[1:]):
        vals = row.split(",")
        kwargs = dict(zip(fields[:1], vals[:1]))
        kwargs["defaults"] = dict(zip(fields[1:], vals[1:]))
        if "order" not in kwargs["defaults"]:
            kwargs["defaults"]["order"] = i + 1
        ob, created = model.objects.get_or_create(**kwargs)
        for k, v in kwargs["defaults"].items():
            setattr(ob, k, v)
        ob.save()


def load_custom_schemas(schemas):
    for s in schemas:
        content_type = ContentType.objects.get(model=s["model"])
        cds = CustomDataSchema.objects.filter(content_type=content_type, study=None).first()
        if not cds:
            cds = CustomDataSchema(content_type=content_type, study=None, schema={})
        dictmerge(cds.schema, s["schema"], on_conflict="b")
        cds.save()
