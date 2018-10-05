# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import kindred.app.models
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('people', '0001_initial'),
        ('contacts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='personaddress',
            name='created_by',
            field=models.ForeignKey(default=kindred.app.models.default_user, to=settings.AUTH_USER_MODEL, related_name='+'),
        ),
        migrations.AddField(
            model_name='personaddress',
            name='modified_by',
            field=models.ForeignKey(default=kindred.app.models.default_user, to=settings.AUTH_USER_MODEL, related_name='+'),
        ),
        migrations.AddField(
            model_name='personaddress',
            name='person',
            field=models.ForeignKey(related_name='addresses', to='people.Person'),
        ),
        migrations.AddField(
            model_name='personaddress',
            name='type',
            field=models.ForeignKey(to='contacts.AddressType'),
        ),
        migrations.AddField(
            model_name='contactdetails',
            name='suburb',
            field=models.ForeignKey(null=True, blank=True, to='contacts.Suburb'),
        ),
        migrations.AlterUniqueTogether(
            name='addresstype',
            unique_together=set([('name',)]),
        ),
        migrations.AlterUniqueTogether(
            name='state',
            unique_together=set([('slug', 'country')]),
        ),
    ]
