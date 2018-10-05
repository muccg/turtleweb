# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('biobank', '0005_auto_20160220_0120'),
    ]

    operations = [
        migrations.CreateModel(
            name='DnaExtractionProtocol',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField(default=0)),
                ('default', models.BooleanField(default=False)),
            ],
            options={
                'abstract': False,
                'ordering': ['order', 'name'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='dnaextractionprotocol',
            unique_together=set([('name',)]),
        ),
        migrations.AddField(
            model_name='sample',
            name='dna_extraction_protocol',
            field=models.ForeignKey(null=True, to='biobank.DnaExtractionProtocol', blank=True, on_delete=django.db.models.deletion.SET_NULL),
        ),
    ]
