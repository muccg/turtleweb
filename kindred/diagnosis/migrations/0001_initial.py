# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='BloodGroup',
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
            name='BodyPart',
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
            name='DiagnosisIndex',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('desc', models.TextField(blank=True)),
                ('code', models.CharField(max_length=254, blank=True)),
                ('group', models.CharField(max_length=254, blank=True)),
            ],
            options={
                'ordering': ['order', 'name'],
                'verbose_name_plural': 'diagnosis indices',
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='GradeStage',
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
            name='ICD10',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('desc', models.TextField(blank=True)),
                ('desc2', models.TextField(blank=True, verbose_name='long description')),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='MetStage',
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
            name='Morphology',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('code', models.CharField(max_length=256, blank=True)),
                ('group', models.CharField(max_length=256, blank=True)),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='PathLab',
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
            name='TumourSite',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('code', models.CharField(max_length=256, blank=True)),
                ('group', models.CharField(max_length=256, blank=True)),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='TumourStage',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('desc', models.CharField(max_length=1000, blank=True)),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.AlterUniqueTogether(
            name='tumourstage',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='tumoursite',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='pathlab',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='morphology',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='metstage',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='icd10',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='gradestage',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='diagnosisindex',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='bodypart',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='bloodgroup',
            unique_together=set([('name',)]),
        ),
    ]
