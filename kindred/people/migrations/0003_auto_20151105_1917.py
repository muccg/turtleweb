# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0002_initial_data'),
    ]

    operations = [
        migrations.AlterField(
            model_name='ethnicgroup',
            name='order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='title',
            name='order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
