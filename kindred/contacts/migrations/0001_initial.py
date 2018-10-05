# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='AddressType',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('desc', models.TextField(blank=True)),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='ContactDetails',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('address_line1', models.CharField(max_length=1000)),
                ('address_line2', models.CharField(max_length=1000, blank=True)),
                ('address_line3', models.CharField(max_length=1000, blank=True)),
                ('address_line4', models.CharField(max_length=1000, blank=True)),
                ('email', models.EmailField(max_length=256, blank=True)),
                ('phone_work', models.CharField(max_length=50, blank=True)),
                ('phone_other', models.CharField(max_length=50, blank=True)),
                ('phone_home', models.CharField(max_length=50, blank=True)),
                ('mobile', models.CharField(max_length=50, blank=True)),
                ('fax', models.CharField(max_length=50, blank=True)),
                ('contact_person', models.CharField(max_length=256, blank=True)),
            ],
            options={
                'verbose_name_plural': 'contact details',
            },
        ),
        migrations.CreateModel(
            name='Country',
            fields=[
                ('iso2', models.CharField(primary_key=True, max_length=2, serialize=False)),
                ('iso3', models.CharField(max_length=3)),
                ('name', models.CharField(max_length=200)),
            ],
            options={
                'verbose_name_plural': 'countries',
            },
        ),
        migrations.CreateModel(
            name='PersonAddress',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('modified_on', models.DateTimeField(auto_now=True)),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('private', models.BooleanField(default=True)),
                ('comment', models.CharField(max_length=1000, blank=True)),
                ('contact', models.ForeignKey(to='contacts.ContactDetails')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='State',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('slug', models.SlugField()),
                ('abbrev', models.CharField(max_length=32, verbose_name='Abbreviation')),
                ('country', models.ForeignKey(to='contacts.Country')),
            ],
        ),
        migrations.CreateModel(
            name='Suburb',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('postcode', models.CharField(max_length=5)),
                ('state', models.ForeignKey(to='contacts.State')),
            ],
        ),
    ]
