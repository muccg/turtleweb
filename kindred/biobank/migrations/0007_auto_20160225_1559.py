# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('biobank', '0006_auto_20160222_2127'),
    ]

    operations = [
        migrations.CreateModel(
            name='SampleSubcultured',
            fields=[
                ('transaction_ptr', models.OneToOneField(to='biobank.Transaction', auto_created=True, parent_link=True, primary_key=True, serialize=False)),
                ('consumed_amount', models.FloatField()),
                ('created_count', models.IntegerField()),
                ('created_amount', models.FloatField()),
            ],
            bases=('biobank.transaction',),
        ),
        migrations.CreateModel(
            name='SampleSubculturedFrom',
            fields=[
                ('transaction_ptr', models.OneToOneField(to='biobank.Transaction', auto_created=True, parent_link=True, primary_key=True, serialize=False)),
                ('number', models.PositiveIntegerField()),
                ('count', models.PositiveIntegerField()),
                ('amount', models.FloatField()),
            ],
            bases=('biobank.transaction',),
        ),
        migrations.AlterField(
            model_name='sample',
            name='concentration',
            field=models.FloatField(default=1.0, help_text='Concentration of DNA, in ng/µL'),
        ),
        migrations.AlterField(
            model_name='samplesending',
            name='amount',
            field=models.FloatField(default=0.0),
        ),
        migrations.AlterField(
            model_name='sampleuse',
            name='amount',
            field=models.FloatField(default=0.0),
        ),
        migrations.AlterField(
            model_name='transaction',
            name='type',
            field=models.CharField(max_length=1, default='', choices=[('C', 'Creation'), ('U', 'Use'), ('D', 'Destruction'), ('X', 'Sending'), ('A', 'Split'), ('S', 'Subdivision'), ('P', 'Processed'), ('F', 'Frozen/Fixed'), ('J', 'Subcultured'), ('K', 'Subcultured from'), ('', 'Note')]),
        ),
        migrations.AddField(
            model_name='samplesubculturedfrom',
            name='origin',
            field=models.ForeignKey(to='biobank.Sample'),
        ),
    ]
