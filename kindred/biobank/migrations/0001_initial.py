# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.utils.timezone
import django.db.models.deletion
import kindred.jsonb


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Container',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=250)),
                ('order', models.PositiveIntegerField(default=0)),
                ('default', models.BooleanField(default=False)),
                ('width', models.IntegerField(default=0)),
                ('height', models.IntegerField(default=0)),
                ('depth', models.IntegerField(default=0)),
                ('data', kindred.jsonb.JSONField(null=True, blank=True)),
            ],
            options={
                'ordering': ['container_id', 'order'],
            },
        ),
        migrations.CreateModel(
            name='ContainerClass',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=250)),
                ('dim', models.PositiveIntegerField(default=1, verbose_name='dimension')),
                ('def_width', models.IntegerField(default=1, verbose_name='default width')),
                ('def_height', models.IntegerField(default=1, verbose_name='default height')),
                ('def_depth', models.IntegerField(default=1, verbose_name='default depth')),
                ('coord', models.CharField(max_length=3, help_text='Co-ordinate type (numeric/alphabetical) for each dimension', default='1A0', verbose_name='co-ordinates')),
                ('contained_by', models.ForeignKey(null=True, blank=True, to='biobank.ContainerClass')),
            ],
        ),
        migrations.CreateModel(
            name='Sample',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('specimen_id', models.CharField(unique=True, db_index=True, max_length=30)),
                ('amount', models.FloatField(help_text='Quantity of sample in units', default=0.0)),
                ('concentration', models.FloatField(help_text='Concentration of DNA', default=1.0)),
                ('comments', models.TextField(max_length=1000)),
                ('data', kindred.jsonb.JSONField(null=True, blank=True)),
            ],
        ),
        migrations.CreateModel(
            name='SampleBehaviour',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='SampleClass',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('unit', models.CharField(choices=[('m', 'Mass'), ('v', 'Volume'), ('p', 'Pieces')], max_length=1, blank=True)),
                ('display_unit', models.CharField(choices=[('kg', 'Kilograms'), ('g', 'Grams'), ('mg', 'Milligrams'), ('µg', 'Micrograms'), ('L', 'Litres'), ('mL', 'Millilitres'), ('µL', 'Microlitres'), ('pcs', 'Pieces')], max_length=3, blank=True)),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='SampleLocation',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('x', models.IntegerField(default=0)),
                ('y', models.IntegerField(default=0)),
                ('z', models.IntegerField(default=0)),
                ('container', models.ForeignKey(to='biobank.Container')),
            ],
        ),
        migrations.CreateModel(
            name='SampleStoredIn',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='SampleSubtype',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('cls', models.ForeignKey(to='biobank.SampleClass')),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='SampleTreatment',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Transaction',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('date', models.DateTimeField(default=django.utils.timezone.now)),
                ('comment', models.TextField()),
                ('data', kindred.jsonb.JSONField(null=True, blank=True)),
                ('type', models.CharField(choices=[('C', 'Creation'), ('U', 'Use'), ('D', 'Destruction'), ('X', 'Sending'), ('A', 'Split'), ('S', 'Subdivision'), ('', 'Note')], max_length=1, default='')),
            ],
            options={
                'ordering': ['sample_id', 'date', 'id'],
                'get_latest_by': 'date',
            },
        ),
        migrations.CreateModel(
            name='SampleCreation',
            fields=[
                ('transaction_ptr', models.OneToOneField(primary_key=True, auto_created=True, parent_link=True, serialize=False, to='biobank.Transaction')),
            ],
            bases=('biobank.transaction',),
        ),
        migrations.CreateModel(
            name='SampleDestroy',
            fields=[
                ('transaction_ptr', models.OneToOneField(primary_key=True, auto_created=True, parent_link=True, serialize=False, to='biobank.Transaction')),
                ('last_location', models.ForeignKey(related_name='+', null=True, blank=True, to='biobank.SampleLocation')),
            ],
            bases=('biobank.transaction',),
        ),
        migrations.CreateModel(
            name='SampleMove',
            fields=[
                ('transaction_ptr', models.OneToOneField(primary_key=True, auto_created=True, parent_link=True, serialize=False, to='biobank.Transaction')),
                ('fro', models.ForeignKey(related_name='+', verbose_name='from', null=True, blank=True, to='biobank.SampleLocation')),
                ('to', models.ForeignKey(related_name='+', null=True, blank=True, to='biobank.SampleLocation')),
            ],
            bases=('biobank.transaction',),
        ),
        migrations.CreateModel(
            name='SampleSending',
            fields=[
                ('transaction_ptr', models.OneToOneField(primary_key=True, auto_created=True, parent_link=True, serialize=False, to='biobank.Transaction')),
                ('amount', models.FloatField(default=1.0)),
                ('collaborator', models.CharField(max_length=200)),
                ('address', models.TextField()),
                ('last_location', models.ForeignKey(related_name='+', null=True, blank=True, to='biobank.SampleLocation')),
            ],
            bases=('biobank.transaction',),
        ),
        migrations.CreateModel(
            name='SampleSplit',
            fields=[
                ('transaction_ptr', models.OneToOneField(primary_key=True, auto_created=True, parent_link=True, serialize=False, to='biobank.Transaction')),
                ('count', models.PositiveIntegerField()),
                ('total_amount', models.FloatField()),
            ],
            bases=('biobank.transaction',),
        ),
        migrations.CreateModel(
            name='SampleSubdivision',
            fields=[
                ('transaction_ptr', models.OneToOneField(primary_key=True, auto_created=True, parent_link=True, serialize=False, to='biobank.Transaction')),
                ('number', models.PositiveIntegerField()),
                ('count', models.PositiveIntegerField()),
                ('amount', models.FloatField()),
            ],
            bases=('biobank.transaction',),
        ),
        migrations.CreateModel(
            name='SampleUse',
            fields=[
                ('transaction_ptr', models.OneToOneField(primary_key=True, auto_created=True, parent_link=True, serialize=False, to='biobank.Transaction')),
                ('amount', models.FloatField(default=1.0)),
            ],
            bases=('biobank.transaction',),
        ),
        migrations.AddField(
            model_name='transaction',
            name='sample',
            field=models.ForeignKey(related_name='transactions', to='biobank.Sample'),
        ),
        migrations.AlterUniqueTogether(
            name='sampletreatment',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='samplestoredin',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='sampleclass',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='samplebehaviour',
            unique_together=set([('name',)]),
        ),
        migrations.AddField(
            model_name='sample',
            name='behaviour',
            field=models.ForeignKey(on_delete=django.db.models.deletion.SET_NULL, null=True, blank=True, to='biobank.SampleBehaviour'),
        ),
        migrations.AddField(
            model_name='sample',
            name='cls',
            field=models.ForeignKey(related_name='+', on_delete=django.db.models.deletion.PROTECT, to='biobank.SampleClass'),
        ),
        migrations.AddField(
            model_name='sample',
            name='location',
            field=models.ForeignKey(related_name='sample', null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, to='biobank.SampleLocation'),
        ),
        migrations.AddField(
            model_name='sample',
            name='stored_in',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='biobank.SampleStoredIn'),
        ),
        migrations.AddField(
            model_name='sample',
            name='subtype',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='biobank.SampleSubtype'),
        ),
        migrations.AddField(
            model_name='sample',
            name='treatment',
            field=models.ForeignKey(on_delete=django.db.models.deletion.SET_NULL, null=True, blank=True, to='biobank.SampleTreatment'),
        ),
        migrations.AddField(
            model_name='container',
            name='cls',
            field=models.ForeignKey(related_name='containers', to='biobank.ContainerClass'),
        ),
        migrations.AddField(
            model_name='container',
            name='container',
            field=models.ForeignKey(related_name='containers', null=True, blank=True, to='biobank.Container'),
        ),
        migrations.AlterUniqueTogether(
            name='samplesubtype',
            unique_together=set([('cls', 'name')]),
        ),
        migrations.AddField(
            model_name='samplesubdivision',
            name='origin',
            field=models.ForeignKey(to='biobank.Sample'),
        ),
    ]
