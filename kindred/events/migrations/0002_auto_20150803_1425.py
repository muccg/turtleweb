# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('biobank', '0002_samplecreation_event'),
        ('people', '0001_initial'),
        ('project', '0001_initial'),
        ('events', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='eventtype',
            name='studies',
            field=models.ManyToManyField(help_text='Studies which this event type applies to. If blank, event type applies to all studies.', related_name='event_types', blank=True, to='project.Study'),
        ),
        migrations.AddField(
            model_name='eventtype',
            name='super_type',
            field=models.ForeignKey(null=True, blank=True, to='events.EventType'),
        ),
        migrations.AddField(
            model_name='event',
            name='person',
            field=models.ForeignKey(to='people.Person'),
        ),
        migrations.AddField(
            model_name='event',
            name='samples',
            field=models.ManyToManyField(help_text='Samples resulting from event', blank=True, to='biobank.Sample'),
        ),
        migrations.AddField(
            model_name='event',
            name='study',
            field=models.ForeignKey(help_text='Designates which study "owns" the samples', to='project.Study'),
        ),
        migrations.AddField(
            model_name='event',
            name='type',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to='events.EventType'),
        ),
        migrations.AlterUniqueTogether(
            name='eventtype',
            unique_together=set([('super_type', 'name')]),
        ),
    ]
