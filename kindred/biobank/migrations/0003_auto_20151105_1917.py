# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('biobank', '0002_samplecreation_event'),
    ]

    operations = [
        migrations.AlterField(
            model_name='samplebehaviour',
            name='order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='sampleclass',
            name='order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='samplestoredin',
            name='order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='samplesubtype',
            name='order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='sampletreatment',
            name='order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
