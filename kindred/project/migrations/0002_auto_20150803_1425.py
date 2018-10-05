# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('contacts', '0002_auto_20150803_1425'),
        ('people', '0001_initial'),
        ('project', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='studygroup',
            name='owner',
            field=models.ForeignKey(related_name='+', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='studygroup',
            name='study',
            field=models.ForeignKey(to='project.Study'),
        ),
        migrations.AddField(
            model_name='studyconsent',
            name='study_member',
            field=models.ForeignKey(related_name='consents', to='project.StudyMember'),
        ),
        migrations.AlterUniqueTogether(
            name='study',
            unique_together=set([('name',)]),
        ),
        migrations.AddField(
            model_name='patienthascase',
            name='case',
            field=models.ForeignKey(to='project.PatientCase'),
        ),
        migrations.AddField(
            model_name='patienthascase',
            name='study_member',
            field=models.ForeignKey(to='project.StudyMember'),
        ),
        migrations.AddField(
            model_name='patientcase',
            name='study',
            field=models.ForeignKey(to='project.Study'),
        ),
        migrations.AddField(
            model_name='collaborator',
            name='contact',
            field=models.ForeignKey(to='contacts.ContactDetails'),
        ),
        migrations.AddField(
            model_name='collaborator',
            name='title',
            field=models.ForeignKey(to='people.Title'),
        ),
        migrations.AlterUniqueTogether(
            name='studymember',
            unique_together=set([('patient', 'study')]),
        ),
        migrations.AlterUniqueTogether(
            name='patienthascase',
            unique_together=set([('study_member', 'case')]),
        ),
        migrations.AlterUniqueTogether(
            name='patientcase',
            unique_together=set([('name', 'study')]),
        ),
    ]
