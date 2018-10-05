# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('project', '0002_auto_20150803_1425'),
    ]

    operations = [
        migrations.AddField(
            model_name='search',
            name='owner',
            field=models.ForeignKey(related_name='+', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='search',
            name='study',
            field=models.ForeignKey(null=True, blank=True, to='project.Study'),
        ),
        migrations.AddField(
            model_name='reportfrontpage',
            name='report',
            field=models.OneToOneField(to='reports.Report'),
        ),
        migrations.AddField(
            model_name='report',
            name='owner',
            field=models.ForeignKey(related_name='+', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='report',
            name='study',
            field=models.ForeignKey(null=True, blank=True, to='project.Study'),
        ),
    ]
