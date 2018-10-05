# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sp', '0003_auto_20151105_1917'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='doctor',
            name='comment',
        ),
    ]
