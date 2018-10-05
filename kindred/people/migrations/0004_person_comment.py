# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0003_auto_20151105_1917'),
        ('sp', '0004_remove_doctor_comment'),
    ]

    operations = [
        migrations.AddField(
            model_name='person',
            name='comment',
            field=models.TextField(blank=True),
        ),
    ]
