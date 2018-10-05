# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models

# Unfortunately, can only do basic json updates in SQL such as:
# UPDATE project_customdataschema
#     SET schema = schema - 'required'
#      WHERE schema->'required' = jsonb_build_array();

def fix_schema(apps, schema_editor):
    CustomDataSchema = apps.get_model("project", "CustomDataSchema")
    for cds in CustomDataSchema.objects.all():
        if cds.schema.get("required", None) == []:
            del cds.schema["required"]
        for name, prop in cds.schema.get("properties", {}).items():
            if "oneOf" in prop:
                prop["enum"] = prop["oneOf"]
                del prop["oneOf"]
        cds.save()

def unfix_schema(apps, schema_editor):
    CustomDataSchema = apps.get_model("project", "CustomDataSchema")
    for cds in CustomDataSchema.objects.all():
        for name, prop in cds.schema.get("properties", {}).items():
            if "enum" in prop:
                prop["oneOf"] = prop["enum"]
                del prop["enum"]
        cds.save()

class Migration(migrations.Migration):

    dependencies = [
        ('project', '0008_auto_20160323_2018'),
    ]

    operations = [
        migrations.RunPython(fix_schema, unfix_schema),    
    ]
