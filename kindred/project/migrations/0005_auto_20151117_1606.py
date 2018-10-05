# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import kindred.jsonb


class Migration(migrations.Migration):

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('project', '0004_auto_20151105_1917'),
    ]

    operations = [
        migrations.CreateModel(
            name='CustomDataSchema',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('schema', kindred.jsonb.JSONField(default={})),
                ('content_type', models.ForeignKey(to='contenttypes.ContentType')),
                ('study', models.ForeignKey(to='project.Study', null=True, blank=True)),
            ],
            options={
                'abstract': False,
                'ordering': ['content_type', 'study'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='dataschema',
            unique_together=set([]),
        ),
        migrations.RemoveField(
            model_name='dataschema',
            name='content_type',
        ),
        migrations.RemoveField(
            model_name='dataschema',
            name='study',
        ),
        migrations.DeleteModel(
            name='DataSchema',
        ),
        migrations.AlterUniqueTogether(
            name='customdataschema',
            unique_together=set([('content_type', 'study')]),
        ),
    ]
