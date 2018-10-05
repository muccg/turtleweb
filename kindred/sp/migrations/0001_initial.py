# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Doctor',
            fields=[
                ('person_ptr', models.OneToOneField(primary_key=True, auto_created=True, parent_link=True, serialize=False, to='people.Person')),
                ('active', models.BooleanField(default=True)),
                ('comment', models.CharField(max_length=1000, blank=True)),
                ('provider_num', models.CharField(max_length=100, verbose_name='Provider Number')),
                ('gp_number', models.CharField(max_length=100, blank=True, verbose_name='GP Number')),
                ('doctor_primary_care_trust_no', models.CharField(max_length=100, blank=True)),
            ],
            bases=('people.person',),
        ),
        migrations.CreateModel(
            name='DoctorType',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('desc', models.CharField(max_length=200, blank=True)),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Hospital',
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
            name='PersonDoctor',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('modified_on', models.DateTimeField(auto_now=True)),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('private', models.BooleanField(default=True)),
                ('role', models.CharField(choices=[('pri', 'Primary'), ('sec', 'Secondary'), ('res', 'Research'), ('adm', 'Admin Only'), ('old', 'Old Address')], max_length=3)),
                ('role_comment', models.CharField(max_length=1000, blank=True)),
                ('current', models.BooleanField(default=False)),
                ('remind_client', models.BooleanField(default=True)),
                ('remind_gp', models.BooleanField(default=True)),
                ('start_reminders', models.DateField(auto_now=True, null=True)),
                ('stop_reminders', models.DateField(blank=True, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='Referral',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('modified_on', models.DateTimeField(auto_now=True)),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('private', models.BooleanField(default=True)),
                ('date', models.DateField()),
                ('comment', models.CharField(max_length=1024, blank=True)),
                ('letter', models.NullBooleanField()),
                ('start_date', models.DateField()),
                ('expiry_date', models.DateField(blank=True, null=True)),
                ('closure_date', models.DateField(blank=True, null=True)),
                ('reason_for_closure', models.CharField(choices=[('N', 'Appointment Not Required'), ('C', 'Completed'), ('R', 'Patient Request')], max_length=1)),
                ('self_referral', models.BooleanField(default=False)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='ReferralSource',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('order', models.PositiveSmallIntegerField()),
                ('default', models.BooleanField(default=False)),
                ('desc', models.CharField(max_length=1000, blank=True)),
                ('show_doctor_list', models.BooleanField(default=False)),
            ],
            options={
                'ordering': ['order', 'name'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='ServiceProvider',
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
    ]
