# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models

def fix_schema(apps, schema_editor):
    EventType = apps.get_model("events", "EventType")
    for et in EventType.objects.filter(fields__isnull=False):
        if et.fields.get("required", None) == []:
            del et.fields["required"]
        for name, prop in et.fields.get("properties", {}).items():
            if "oneOf" in prop:
                prop["enum"] = prop["oneOf"]
                del prop["oneOf"]
        et.save()

def unfix_schema(apps, schema_editor):
    EventType = apps.get_model("events", "EventType")
    for et in EventType.objects.filter(fields__isnull=False):
        for name, prop in et.fields.get("properties", {}).items():
            if "enum" in prop:
                prop["oneOf"] = prop["enum"]
                del prop["enum"]
        et.save()


class Migration(migrations.Migration):

    dependencies = [
        ('events', '0004_auto_20160218_0746'),
    ]

    operations = [
        migrations.RunPython(fix_schema, unfix_schema),
    ]
