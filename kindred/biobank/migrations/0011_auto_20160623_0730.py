# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('biobank', '0010_auto_20160330_1630'),
    ]

    operations = [
        migrations.AddField(
            model_name='sample',
            name='display_unit',
            field=models.CharField(max_length=10, blank=True, choices=[('kg', 'Kilograms'), ('g', 'Grams'), ('mg', 'Milligrams'), ('µg', 'Micrograms'), ('L', 'Litres'), ('mL', 'Millilitres'), ('µL', 'Microlitres'), ('pcs', 'Pieces'), ('vials', 'Vials')]),
        ),
        migrations.AlterField(
            model_name='sampleclass',
            name='display_unit',
            field=models.CharField(max_length=10, blank=True, choices=[('kg', 'Kilograms'), ('g', 'Grams'), ('mg', 'Milligrams'), ('µg', 'Micrograms'), ('L', 'Litres'), ('mL', 'Millilitres'), ('µL', 'Microlitres'), ('pcs', 'Pieces'), ('vials', 'Vials')]),
        ),
        migrations.AlterField(
            model_name='transaction',
            name='type',
            field=models.CharField(max_length=1, choices=[('C', 'Collection'), ('U', 'Use'), ('D', 'Destruction'), ('X', 'Sending'), ('A', 'Split'), ('S', 'Subdivision'), ('P', 'Processed'), ('F', 'Frozen/Fixed'), ('J', 'Subcultured'), ('K', 'Subcultured from'), ('L', 'Adjustment'), ('', 'Note')], default=''),
        ),
    ]
