# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_initial_data'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='password_change_date',
            field=models.DateTimeField(null=True, auto_now_add=True),
        ),
    ]
