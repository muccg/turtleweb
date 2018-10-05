# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import kindred.app.models
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('sp', '0002_auto_20150803_1425'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('contenttypes', '0002_remove_content_type_name'),
        ('people', '0001_initial'),
        ('records', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='fileattachment',
            name='content_type',
            field=models.ForeignKey(to='contenttypes.ContentType'),
        ),
        migrations.AddField(
            model_name='fileattachment',
            name='creator',
            field=models.ForeignKey(to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='csvtemp',
            name='creator',
            field=models.ForeignKey(to=settings.AUTH_USER_MODEL),
        ),
    ]
