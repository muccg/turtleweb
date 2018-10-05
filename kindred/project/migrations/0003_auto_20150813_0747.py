# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import kindred.jsonb


class Migration(migrations.Migration):

    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('project', '0002_auto_20150803_1425'),
    ]

    operations = [
        migrations.CreateModel(
            name='DataSchema',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True, verbose_name='ID', auto_created=True)),
                ('schema', kindred.jsonb.JSONField(default={})),
                ('content_type', models.ForeignKey(to='contenttypes.ContentType')),
                ('study', models.ForeignKey(null=True, blank=True, to='project.Study')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AlterUniqueTogether(
            name='dataschema',
            unique_together=set([('content_type', 'study')]),
        ),
    ]
