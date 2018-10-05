# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import kindred.jsonb


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Event',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('ident', models.CharField(unique=True, default='', max_length=30)),
                ('date', models.DateTimeField()),
                ('data', kindred.jsonb.JSONField(help_text='Fields as defined by the event type', blank=True, null=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='EventType',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('fields', kindred.jsonb.JSONField(null=True, blank=True)),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
    ]
