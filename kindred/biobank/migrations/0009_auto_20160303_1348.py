# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('biobank', '0008_auto_20160226_1452'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='SampleCreation',
            new_name='SampleCollection',
        ),
        migrations.AlterField(
            model_name='transaction',
            name='type',
            field=models.CharField(default='', choices=[('C', 'Collection'), ('U', 'Use'), ('D', 'Destruction'), ('X', 'Sending'), ('A', 'Split'), ('S', 'Subdivision'), ('P', 'Processed'), ('F', 'Frozen/Fixed'), ('J', 'Subcultured'), ('K', 'Subcultured from'), ('', 'Note')], max_length=1),
        ),
    ]
