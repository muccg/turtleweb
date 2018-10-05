# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import kindred.app.models
import kindred.users.models
import kindred.jsonb
import django.utils.timezone
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0006_require_contenttypes_0002'),
    ]

    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, verbose_name='last login', null=True)),
                ('is_superuser', models.BooleanField(help_text='Designates that this user has all permissions without explicitly assigning them.', default=False, verbose_name='superuser status')),
                ('modified_on', models.DateTimeField(auto_now=True)),
                ('created_on', models.DateTimeField(auto_now_add=True)),
                ('private', models.BooleanField(default=True)),
                ('email', models.EmailField(db_index=True, unique=True, verbose_name='email address', max_length=255)),
                ('first_name', models.CharField(max_length=256)),
                ('last_name', models.CharField(max_length=256)),
                ('is_active', models.BooleanField(help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.', default=True, verbose_name='active')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('mobile_phone_number', models.CharField(max_length=100)),
                ('tokenless_login_allowed', models.BooleanField(help_text='Allows the user to log in without a 2-factor token', default=False)),
                ('created_by', models.ForeignKey(default=kindred.app.models.default_user, to=settings.AUTH_USER_MODEL, related_name='+')),
                ('groups', models.ManyToManyField(verbose_name='groups', related_query_name='user', help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', blank=True, to='auth.Group')),
                ('modified_by', models.ForeignKey(default=kindred.app.models.default_user, to=settings.AUTH_USER_MODEL, related_name='+')),
                ('user_permissions', models.ManyToManyField(verbose_name='user permissions', related_query_name='user', help_text='Specific permissions for this user.', related_name='user_set', blank=True, to='auth.Permission')),
            ],
            options={
                'abstract': False,
            },
            managers=[
                ('objects', kindred.users.models.CaseInsensitiveUserManager()),
            ],
        ),
        migrations.CreateModel(
            name='UserPrefs',
            fields=[
                ('id', models.AutoField(primary_key=True, auto_created=True, serialize=False, verbose_name='ID')),
                ('prefs', kindred.jsonb.JSONField(default={})),
                ('user', models.OneToOneField(related_name='prefs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'user prefs',
            },
        ),
    ]
