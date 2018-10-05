# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('biobank', '0009_auto_20160303_1348'),
    ]

    operations = [
        migrations.CreateModel(
            name='SampleAdjustment',
            fields=[
                ('transaction_ptr', models.OneToOneField(parent_link=True, primary_key=True, auto_created=True, to='biobank.Transaction', serialize=False)),
                ('amount', models.FloatField(default=0.0)),
            ],
            bases=('biobank.transaction',),
        ),
        migrations.AlterField(
            model_name='transaction',
            name='type',
            field=models.CharField(max_length=1, default='', choices=[('C', 'Collection'), ('U', 'Use'), ('D', 'Destruction'), ('X', 'Sending'), ('A', 'Split'), ('S', 'Subdivision'), ('P', 'Processed'), ('F', 'Frozen/Fixed'), ('J', 'Subcultured'), ('K', 'Subcultured from'), ('A', 'Adjustment'), ('', 'Note')]),
        ),
    ]
