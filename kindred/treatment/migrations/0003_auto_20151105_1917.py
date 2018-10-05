# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('treatment', '0002_auto_20150803_1425'),
    ]

    operations = [
        migrations.AlterField(
            model_name='intervention',
            name='order',
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
