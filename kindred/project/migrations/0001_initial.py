# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import kindred.jsonb


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Collaborator',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('first_name', models.CharField(max_length=200)),
                ('last_name', models.CharField(max_length=200)),
                ('data', kindred.jsonb.JSONField(null=True, blank=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='PatientCase',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='PatientHasCase',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Study',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('desc', models.TextField(blank=True)),
                ('slug', models.SlugField(unique=True)),
                ('is_archived', models.BooleanField(help_text='Archiving hides the study away so it can be forgotten about', default=False)),
                ('data', kindred.jsonb.JSONField(null=True, blank=True)),
            ],
            options={
                'ordering': ['order', 'name'],
                'verbose_name_plural': 'studies',
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='StudyConsent',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('given', models.NullBooleanField(help_text='Set if patient has given consent, unset if patient has declined/withdrawn consent')),
                ('date', models.DateTimeField(blank=True, null=True)),
                ('comments', models.TextField(blank=True)),
            ],
        ),
        migrations.CreateModel(
            name='StudyGroup',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('desc', models.TextField(blank=True)),
                ('data', kindred.jsonb.JSONField(null=True, blank=True)),
                ('collaborators', models.ManyToManyField(blank=True, related_name='study_groups', to='project.Collaborator')),
                ('members', models.ManyToManyField(blank=True, related_name='study_groups', to='people.Person')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='StudyMember',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('consent_request_date', models.DateTimeField(blank=True, null=True)),
                ('patient', models.ForeignKey(related_name='studies', to='people.Person')),
                ('study', models.ForeignKey(related_name='members', to='project.Study')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
