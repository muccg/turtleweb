# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('contacts', '0004_load_postcodes'),
    ]

    operations = [
        migrations.AlterField(
            model_name='addresstype',
            name='order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
