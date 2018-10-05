# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import kindred.app.models
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('contacts', '0002_auto_20150803_1425'),
        ('people', '0001_initial'),
        ('users', '0001_initial'),
        ('sp', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='StaffMember',
            fields=[
                ('user_ptr', models.OneToOneField(primary_key=True, auto_created=True, parent_link=True, serialize=False, to=settings.AUTH_USER_MODEL)),
                ('can_send_account', models.NullBooleanField()),
                ('default_service_provider', models.ForeignKey(null=True, blank=True, to='sp.ServiceProvider')),
            ],
            options={
                'abstract': False,
            },
            bases=('users.user',),
        ),
        migrations.CreateModel(
            name='StaffMemberType',
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
            name='Surveillance',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('modified_on', models.DateTimeField(auto_now=True)),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('private', models.BooleanField(default=True)),
                ('interval', models.IntegerField(help_text='Period in minutes between surveillances')),
                ('comment', models.TextField(blank=True)),
                ('date_done', models.DateField(blank=True, null=True)),
                ('date_due', models.DateField(blank=True, null=True)),
                ('date_reminder_sent', models.DateField(blank=True, null=True)),
                ('diagnosis', models.CharField(max_length=254, blank=True)),
                ('created_by', models.ForeignKey(default=kindred.app.models.default_user, to=settings.AUTH_USER_MODEL, related_name='+')),
                ('doctor', models.ForeignKey(blank=True, related_name='doctor_surveillance_set', to='sp.Doctor')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='SurveillanceLocation',
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
            name='SurveillanceOutcome',
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
            name='SurveillanceTiming',
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
            name='SurveillanceType',
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
        migrations.AlterUniqueTogether(
            name='surveillancetype',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='surveillancetiming',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='surveillanceoutcome',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='surveillancelocation',
            unique_together=set([('name',)]),
        ),
        migrations.AddField(
            model_name='surveillance',
            name='location',
            field=models.ForeignKey(blank=True, to='sp.SurveillanceLocation'),
        ),
        migrations.AddField(
            model_name='surveillance',
            name='modified_by',
            field=models.ForeignKey(default=kindred.app.models.default_user, to=settings.AUTH_USER_MODEL, related_name='+'),
        ),
        migrations.AddField(
            model_name='surveillance',
            name='outcome',
            field=models.ForeignKey(blank=True, to='sp.SurveillanceOutcome'),
        ),
        migrations.AddField(
            model_name='surveillance',
            name='person',
            field=models.ForeignKey(to='people.Person'),
        ),
        migrations.AddField(
            model_name='surveillance',
            name='service_provider',
            field=models.ForeignKey(null=True, blank=True, to='sp.ServiceProvider'),
        ),
        migrations.AddField(
            model_name='surveillance',
            name='timing',
            field=models.ForeignKey(blank=True, to='sp.SurveillanceTiming'),
        ),
        migrations.AddField(
            model_name='surveillance',
            name='type',
            field=models.ForeignKey(null=True, blank=True, to='sp.SurveillanceType'),
        ),
        migrations.AlterUniqueTogether(
            name='staffmembertype',
            unique_together=set([('name',)]),
        ),
        migrations.AddField(
            model_name='staffmember',
            name='type',
            field=models.ForeignKey(to='sp.StaffMemberType'),
        ),
        migrations.AlterUniqueTogether(
            name='serviceprovider',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='referralsource',
            unique_together=set([('name',)]),
        ),
        migrations.AddField(
            model_name='referral',
            name='by',
            field=models.ForeignKey(related_name='referrals_made', null=True, blank=True, to='sp.Doctor'),
        ),
        migrations.AddField(
            model_name='referral',
            name='created_by',
            field=models.ForeignKey(default=kindred.app.models.default_user, to=settings.AUTH_USER_MODEL, related_name='+'),
        ),
        migrations.AddField(
            model_name='referral',
            name='modified_by',
            field=models.ForeignKey(default=kindred.app.models.default_user, to=settings.AUTH_USER_MODEL, related_name='+'),
        ),
        migrations.AddField(
            model_name='referral',
            name='person',
            field=models.ForeignKey(related_name='patient_referrals', to='people.Person'),
        ),
        migrations.AddField(
            model_name='referral',
            name='service_provider',
            field=models.ForeignKey(null=True, blank=True, to='sp.ServiceProvider'),
        ),
        migrations.AddField(
            model_name='referral',
            name='source',
            field=models.ForeignKey(to='sp.ReferralSource'),
        ),
        migrations.AddField(
            model_name='referral',
            name='staff_member',
            field=models.ForeignKey(to='sp.StaffMember', null=True),
        ),
        migrations.AddField(
            model_name='referral',
            name='to',
            field=models.ForeignKey(related_name='doctor_referrals', null=True, blank=True, to='sp.Doctor'),
        ),
        migrations.AddField(
            model_name='persondoctor',
            name='created_by',
            field=models.ForeignKey(default=kindred.app.models.default_user, to=settings.AUTH_USER_MODEL, related_name='+'),
        ),
        migrations.AddField(
            model_name='persondoctor',
            name='doctor',
            field=models.ForeignKey(related_name='fixme_assoc_set', to='sp.Doctor'),
        ),
        migrations.AddField(
            model_name='persondoctor',
            name='modified_by',
            field=models.ForeignKey(default=kindred.app.models.default_user, to=settings.AUTH_USER_MODEL, related_name='+'),
        ),
        migrations.AddField(
            model_name='persondoctor',
            name='person',
            field=models.ForeignKey(to='people.Person'),
        ),
        migrations.AlterUniqueTogether(
            name='hospital',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='doctortype',
            unique_together=set([('name',)]),
        ),
        migrations.AddField(
            model_name='doctor',
            name='contact',
            field=models.ForeignKey(to='contacts.ContactDetails', null=True),
        ),
        migrations.AddField(
            model_name='doctor',
            name='type',
            field=models.ForeignKey(to='sp.DoctorType'),
        ),
        migrations.AlterUniqueTogether(
            name='persondoctor',
            unique_together=set([('person', 'doctor', 'role')]),
        ),
    ]
