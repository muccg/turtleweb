# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0003_instances'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customdropdownlist',
            name='order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='customdropdownvalue',
            name='order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
