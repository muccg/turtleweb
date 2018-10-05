# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import kindred.jsonb


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0004_person_comment'),
    ]

    operations = [
        migrations.AlterField(
            model_name='person',
            name='data',
            field=kindred.jsonb.JSONField(null=True, blank=True, help_text='Fields as defined by the user'),
        ),
    ]
