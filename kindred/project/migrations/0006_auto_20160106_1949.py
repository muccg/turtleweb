# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import kindred.jsonb


class Migration(migrations.Migration):

    dependencies = [
        ('records', '0002_auto_20150803_1425'),
        ('project', '0005_auto_20151117_1606'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='studyconsent',
            name='comments',
        ),
        migrations.AddField(
            model_name='studyconsent',
            name='data',
            field=kindred.jsonb.JSONField(blank=True, null=True),
        ),
    ]
