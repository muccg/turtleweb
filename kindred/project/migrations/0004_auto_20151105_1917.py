# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('project', '0003_auto_20150813_0747'),
    ]

    operations = [
        migrations.AlterField(
            model_name='patientcase',
            name='order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='study',
            name='order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
