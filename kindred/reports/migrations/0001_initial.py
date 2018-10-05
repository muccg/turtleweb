# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import kindred.jsonb


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Report',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('resource', models.CharField(choices=[('person', 'Person'), ('event', 'Event'), ('sample', 'Sample'), ('user', 'User')], max_length=30)),
                ('name', models.CharField(max_length=200)),
                ('desc', models.TextField(blank=True)),
                ('query', kindred.jsonb.JSONField(blank=True, null=True, help_text='Query expression parsed from the Turtleweb query syntax')),
                ('order_by', models.CharField(max_length=200, help_text='Whitespace separated list of fields', blank=True)),
                ('list_columns', models.CharField(max_length=200, help_text='Whitespace separated list of fields', blank=True)),
                ('group_by', models.CharField(max_length=200, help_text='Whitespace separated list of fields', blank=True)),
                ('chart', models.CharField(choices=[('bar', 'Bar'), ('pie', 'Pie')], max_length=3, blank=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='ReportFrontPage',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('order', models.IntegerField(default=0)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Search',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('resource', models.CharField(choices=[('person', 'Person'), ('event', 'Event'), ('sample', 'Sample'), ('user', 'User')], max_length=30)),
                ('name', models.CharField(max_length=200)),
                ('desc', models.TextField(blank=True)),
                ('query', kindred.jsonb.JSONField(blank=True, null=True, help_text='Query expression parsed from the Turtleweb query syntax')),
                ('order_by', models.CharField(max_length=200, help_text='Whitespace separated list of fields', blank=True)),
                ('list_columns', models.CharField(max_length=200, help_text='Whitespace separated list of fields', blank=True)),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
