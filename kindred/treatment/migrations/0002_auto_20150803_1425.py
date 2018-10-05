# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import kindred.app.models
from django.conf import settings
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('project', '0002_auto_20150803_1425'),
        ('events', '0002_auto_20150803_1425'),
        ('treatment', '0001_initial'),
        ('people', '0001_initial'),
        ('sp', '0002_auto_20150803_1425'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='treatment',
            name='created_by',
            field=models.ForeignKey(default=kindred.app.models.default_user, to=settings.AUTH_USER_MODEL, related_name='+'),
        ),
        migrations.AddField(
            model_name='treatment',
            name='doctor',
            field=models.ForeignKey(null=True, help_text='Doctor for tx', blank=True, to='sp.Doctor'),
        ),
        migrations.AddField(
            model_name='treatment',
            name='event',
            field=models.ForeignKey(null=True, blank=True, to='events.Event'),
        ),
        migrations.AddField(
            model_name='treatment',
            name='intervention',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='treatment.Intervention'),
        ),
        migrations.AddField(
            model_name='treatment',
            name='modified_by',
            field=models.ForeignKey(default=kindred.app.models.default_user, to=settings.AUTH_USER_MODEL, related_name='+'),
        ),
        migrations.AddField(
            model_name='treatment',
            name='person',
            field=models.ForeignKey(related_name='treatments', to='people.Person'),
        ),
        migrations.AddField(
            model_name='intervention',
            name='studies',
            field=models.ManyToManyField(help_text='Studies which this intervention applies to. If blank, intervention applies to all studies.', related_name='interventions', blank=True, to='project.Study'),
        ),
        migrations.AddField(
            model_name='intervention',
            name='super_type',
            field=models.ForeignKey(null=True, blank=True, to='treatment.Intervention'),
        ),
        migrations.AlterUniqueTogether(
            name='intervention',
            unique_together=set([('super_type', 'name')]),
        ),
    ]
