# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('project', '0007_auto_20160111_2046'),
    ]

    operations = [
        migrations.CreateModel(
            name='ConsentObtainedBy',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True, auto_created=True, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField(default=0)),
                ('default', models.BooleanField(default=False)),
            ],
            options={
                'abstract': False,
                'ordering': ['order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='ConsentStatus',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True, auto_created=True, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField(default=0)),
                ('default', models.BooleanField(default=False)),
            ],
            options={
                'abstract': False,
                'ordering': ['order', 'name'],
            },
        ),
        migrations.RemoveField(
            model_name='studyconsent',
            name='given',
        ),
        migrations.AlterField(
            model_name='studyconsent',
            name='date',
            field=models.DateTimeField(null=True, help_text='Date consent was given', blank=True),
        ),
        migrations.AlterUniqueTogether(
            name='consentstatus',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='consentobtainedby',
            unique_together=set([('name',)]),
        ),
        migrations.AddField(
            model_name='studyconsent',
            name='consented_by',
            field=models.ForeignKey(null=True, related_name='consents', blank=True, to='project.ConsentObtainedBy'),
        ),
        migrations.AddField(
            model_name='studyconsent',
            name='status',
            field=models.ForeignKey(default=None, to='project.ConsentStatus'),
            preserve_default=False,
        ),
    ]
