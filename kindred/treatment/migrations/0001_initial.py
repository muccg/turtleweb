# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import kindred.jsonb


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Intervention',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('desc', models.TextField(blank=True)),
                ('group', models.CharField(max_length=250, help_text='Intervention category')),
                ('abbr_name', models.CharField(max_length=100)),
                ('alternative_name', models.CharField(max_length=250, help_text='Drugs/treatments can go under multiple names')),
                ('comments', models.TextField(max_length=1000, blank=True)),
                ('units', models.CharField(max_length=100, help_text='Units of treatment grey/mg/mL/litres/pints/etc', blank=True)),
                ('route', models.CharField(max_length=250, help_text='How the intervention is delivered to the patient (injection/radiation beam/oral/etc)', blank=True, verbose_name='Route of administration')),
                ('fields', kindred.jsonb.JSONField(null=True, blank=True)),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Treatment',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('modified_on', models.DateTimeField(auto_now=True)),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('private', models.BooleanField(default=True)),
                ('comments', models.TextField(max_length=2000, blank=True)),
                ('cycles', models.IntegerField(null=True)),
                ('dose', models.FloatField(help_text='Dose of treatment', null=True)),
                ('start_date', models.DateField(blank=True, null=True)),
                ('stop_date', models.DateField(blank=True, null=True)),
                ('stop_reason', models.CharField(max_length=500)),
                ('data', kindred.jsonb.JSONField(null=True, blank=True)),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
