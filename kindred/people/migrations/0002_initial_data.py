# -*- coding: utf-8 -*-


from django.db import models, migrations


def initial_data(apps, schema_editor):
    Title = apps.get_model("people", "Title")
    title = Title(name="", order=1, default=True)
    title.save()


def initial_data_reverse(apps, schema_editor):
    apps.get_model("people", "Title").objects.all().delete()
    apps.get_model("people", "Person").objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('people', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(initial_data, initial_data_reverse),
    ]
