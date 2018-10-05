# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('biobank', '0004_auto_20160218_0755'),
    ]

    operations = [
        migrations.CreateModel(
            name='SampleFrozenFixed',
            fields=[
                ('transaction_ptr', models.OneToOneField(primary_key=True, to='biobank.Transaction', serialize=False, auto_created=True, parent_link=True)),
            ],
            bases=('biobank.transaction',),
        ),
        migrations.CreateModel(
            name='SampleProcessed',
            fields=[
                ('transaction_ptr', models.OneToOneField(primary_key=True, to='biobank.Transaction', serialize=False, auto_created=True, parent_link=True)),
            ],
            bases=('biobank.transaction',),
        ),
        migrations.AlterField(
            model_name='transaction',
            name='type',
            field=models.CharField(default='', choices=[('C', 'Creation'), ('U', 'Use'), ('D', 'Destruction'), ('X', 'Sending'), ('A', 'Split'), ('S', 'Subdivision'), ('P', 'Processed'), ('F', 'Frozen/Fixed'), ('', 'Note')], max_length=1),
        ),
    ]
