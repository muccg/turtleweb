# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('biobank', '0007_auto_20160225_1559'),
    ]

    operations = [
        migrations.AlterField(
            model_name='samplesubculturedfrom',
            name='origin',
            field=models.ForeignKey(related_name='subcultured', to='biobank.Transaction'),
        ),
        migrations.AlterField(
            model_name='samplesubdivision',
            name='origin',
            field=models.ForeignKey(related_name='split', to='biobank.Transaction'),
        ),
    ]
