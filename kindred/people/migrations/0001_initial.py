# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.db.models.deletion
import kindred.jsonb
import kindred.people.models


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='EthnicGroup',
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
            name='FamilyGroup',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('desc', models.CharField(max_length=1000, blank=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='FamilyMember',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('family_contact', models.BooleanField(help_text='This person is a suitable contact for the rest of the family', default=False)),
                ('spokesperson', models.BooleanField(help_text='\n        The family member could be an appropriate lay spokesperson for\n        the condition noted in the family. This is not the same as\n        Family Contact?  This does not imply that the person has consented\n        to being a spokesman, and specific consent must be sought in\n        every instance and on each occasion.', default=False)),
                ('proband', models.BooleanField(help_text='Denotes the particular person being studied or reported on', default=False)),
                ('family_group', models.ForeignKey(to='people.FamilyGroup')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='NoChildren',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('reason', models.CharField(choices=[('O', 'Other Reason'), ('I', 'Infertility')], max_length=1, blank=True)),
                ('notes', models.TextField(blank=True)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Other',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('monkey', models.BooleanField(default=False)),
                ('main', models.IntegerField()),
                ('nextother', models.IntegerField()),
                ('rtype', models.IntegerField()),
                ('index', models.IntegerField()),
                ('child', models.IntegerField()),
                ('cx1', models.IntegerField()),
                ('cx2', models.IntegerField()),
                ('cy1', models.IntegerField()),
                ('cy2', models.IntegerField()),
                ('sx1', models.IntegerField()),
                ('sx2', models.IntegerField()),
                ('sy1', models.IntegerField()),
                ('sy2', models.IntegerField()),
            ],
        ),
        migrations.CreateModel(
            name='Person',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('first_name', models.CharField(max_length=256)),
                ('second_name', models.CharField(max_length=256, blank=True)),
                ('last_name', models.CharField(max_length=256)),
                ('maiden_name', models.CharField(max_length=256, help_text='Surname prior to marital name change', blank=True)),
                ('other_name', models.CharField(max_length=256, help_text='Other previous surnames', blank=True)),
                ('initials', models.CharField(max_length=64, help_text='Initials of given names. If blank, value will be derived from names', blank=True)),
                ('sex', models.CharField(choices=[('', 'Unknown'), ('M', 'Male'), ('F', 'Female')], max_length=1)),
                ('born', models.BooleanField(help_text='Is this person born yet?', default=True)),
                ('deceased', models.BooleanField(help_text='Has this person died?', default=False)),
                ('dob', models.DateField(help_text='Date of birth, if known', blank=True, verbose_name='Date of Birth', null=True, db_index=True)),
                ('dod', models.DateField(help_text='Date of death, if known', blank=True, verbose_name='Date of Death', null=True, db_index=True)),
                ('dob_checked', models.BooleanField(help_text='It is verified that the birth date is correct', default=True, verbose_name='DOB Checked')),
                ('dod_checked', models.BooleanField(help_text='It is verified that the death date is correct', default=True, verbose_name='DOD Checked')),
                ('place_of_birth', models.CharField(max_length=256, blank=True)),
                ('cause_of_death', models.CharField(max_length=256, blank=True)),
                ('twins_identical', models.BooleanField(help_text='Monozygotic/Dizygotic - Identical/Fraternal', default=False)),
                ('data', kindred.jsonb.JSONField(blank=True, null=True)),
                ('patient_id', models.CharField(unique=True, default='', max_length=30)),
                ('father', models.ForeignKey(related_name='paternal_children', null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, to='people.Person')),
                ('mother', models.ForeignKey(related_name='maternal_children', null=True, blank=True, on_delete=django.db.models.deletion.SET_NULL, to='people.Person')),
            ],
            options={
                'ordering': ['id'],
            },
        ),
        migrations.CreateModel(
            name='Title',
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
            name='title',
            unique_together=set([('name',)]),
        ),
        migrations.AddField(
            model_name='person',
            name='title',
            field=models.ForeignKey(default=kindred.people.models.default_title, on_delete=django.db.models.deletion.PROTECT, to='people.Title'),
        ),
        migrations.AddField(
            model_name='person',
            name='twins',
            field=models.ManyToManyField(blank=True, related_name='twins_rel_+', to='people.Person'),
        ),
        migrations.AddField(
            model_name='other',
            name='person',
            field=models.ForeignKey(to='people.Person'),
        ),
        migrations.AddField(
            model_name='nochildren',
            name='female',
            field=models.ForeignKey(related_name='+', to='people.Person'),
        ),
        migrations.AddField(
            model_name='nochildren',
            name='male',
            field=models.ForeignKey(related_name='+', to='people.Person'),
        ),
        migrations.AddField(
            model_name='familymember',
            name='person',
            field=models.ForeignKey(related_name='family_membership', to='people.Person'),
        ),
        migrations.AddField(
            model_name='familygroup',
            name='members',
            field=models.ManyToManyField(related_name='family_groups', through='people.FamilyMember', to='people.Person'),
        ),
        migrations.AlterUniqueTogether(
            name='ethnicgroup',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='nochildren',
            unique_together=set([('male', 'female')]),
        ),
        migrations.AlterIndexTogether(
            name='nochildren',
            index_together=set([('male', 'female')]),
        ),
    ]
