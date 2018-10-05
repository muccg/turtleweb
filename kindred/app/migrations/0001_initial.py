# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import kindred.jsonb

class Migration(migrations.Migration):

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='AccessLog',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('C', 'Create'), ('R', 'Read'), ('U', 'Update'), ('D', 'Delete')], max_length=1)),
                ('modified_on', models.DateTimeField(auto_now=True)),
                ('ip_address', models.GenericIPAddressField(verbose_name='IP Address')),
                ('object_id', models.PositiveIntegerField()),
                ('resource_repr', models.TextField()),
                ('content_type', models.ForeignKey(to='contenttypes.ContentType')),
            ],
        ),
        migrations.CreateModel(
            name='CustomDropDownList',
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
            name='CustomDropDownValue',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('desc', models.TextField(blank=True)),
                ('list', models.ForeignKey(related_name='items', to='app.CustomDropDownList')),
            ],
            options={
                'ordering': ['list', 'order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='IDMap',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('from_table', models.CharField(max_length=100, db_index=True)),
                ('to_table', models.CharField(max_length=100, db_index=True)),
                ('oldid', models.CharField(max_length=100, db_index=True)),
                ('newid', models.CharField(max_length=100)),
            ],
            options={
                'verbose_name_plural': 'id map',
            },
        ),
        migrations.CreateModel(
            name='Instance',
            fields=[
                ('code', models.SlugField(primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=80)),
            ],
        ),
        migrations.CreateModel(
            name='MigrationRun',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('start_time', models.DateTimeField(auto_now_add=True)),
                ('finish_time', models.DateTimeField(blank=True, null=True)),
                ('report', kindred.jsonb.JSONField(default={})),
            ],
        ),
        migrations.AddField(
            model_name='idmap',
            name='migration',
            field=models.ForeignKey(related_name='idmap', to='app.MigrationRun'),
        ),
        migrations.AlterUniqueTogether(
            name='customdropdownlist',
            unique_together=set([('name',)]),
        ),
    ]
