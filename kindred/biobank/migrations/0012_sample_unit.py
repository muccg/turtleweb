# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


def fill_sample_unit(apps, schema_editor):
    Sample = apps.get_model("biobank", "Sample")
    for sample in Sample.objects.filter(display_unit=""):
        sample.display_unit = sample.cls.display_unit
        sample.save()

def unfill(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('biobank', '0011_auto_20160623_0730'),
    ]

    operations = [
        migrations.RunPython(fill_sample_unit, unfill),
    ]
