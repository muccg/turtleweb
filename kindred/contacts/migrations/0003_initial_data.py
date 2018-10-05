# -*- coding: utf-8 -*-


from django.db import models, migrations



def initial_data(apps, schema_editor):
    db_alias = schema_editor.connection.alias

    Country = apps.get_model("contacts", "Country")
    State = apps.get_model("contacts", "State")

    Country.objects.using(db_alias).bulk_create([
        Country(pk="au", name="Australia", iso3="aus"),
    ])

    State.objects.using(db_alias).bulk_create([
        State(country_id="au", slug="WA", abbrev="WA", name="Western Australia"),
        State(country_id="au", abbrev="SA", name="South Australia", slug="SA"),
        State(country_id="au", abbrev="NT", name="Northern Territory", slug="NT"),
        State(country_id="au", abbrev="QLD", name="Queensland", slug="QLD"),
        State(country_id="au", abbrev="NSW", name="New South Wales", slug="NSW"),
        State(country_id="au", abbrev="ACT", name="Australian Capital Territory", slug="ACT"),
        State(country_id="au", abbrev="VIC", name="Victoria", slug="VIC"),
        State(country_id="au", abbrev="TAS", name="Tasmania", slug="TAS"),
    ])


def initial_data_reverse(apps, schema_editor):
    apps.get_model("people", "Country").objects.all().delete()
    apps.get_model("people", "State").objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('contacts', '0002_auto_20150803_1425'),
    ]

    operations = [
        migrations.RunPython(initial_data, initial_data_reverse),
    ]
