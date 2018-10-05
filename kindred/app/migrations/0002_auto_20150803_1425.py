# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='accesslog',
            name='modified_by',
            field=models.ForeignKey(db_constraint=False, related_name='+', on_delete=django.db.models.deletion.DO_NOTHING, to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterUniqueTogether(
            name='idmap',
            unique_together=set([('from_table', 'to_table', 'oldid')]),
        ),
        migrations.AlterUniqueTogether(
            name='customdropdownvalue',
            unique_together=set([('list', 'name')]),
        ),
    ]
