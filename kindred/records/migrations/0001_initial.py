# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CsvTemp',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('session_key', models.CharField(max_length=40, db_index=True)),
                ('filename', models.CharField(max_length=255)),
                ('header', models.TextField(max_length=1000)),
                ('data', models.TextField()),
                ('size', models.PositiveIntegerField()),
                ('num_rows', models.PositiveIntegerField(default=0)),
                ('num_cols', models.PositiveIntegerField(default=0)),
                ('created', models.DateTimeField(auto_now_add=True)),
            ],
        ),
        migrations.CreateModel(
            name='FileAttachment',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('object_id', models.PositiveIntegerField()),
                ('file', models.FileField(upload_to='')),
                ('name', models.CharField(max_length=255)),
                ('desc', models.TextField(max_length=1000, blank=True)),
                ('mime_type', models.CharField(max_length=255, help_text="Content-type header provided by user's browser")),
                ('created', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
