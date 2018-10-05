# -*- coding: utf-8 -*-


import os
import os.path
import csv
from collections import namedtuple
from six.moves import map

from django.db import migrations

CSV_FILE = os.path.join(os.path.dirname(__file__), "pc-full.csv")
Postcode = namedtuple("Postcode", ("state", "locality", "postcode"))


def load_suburbs(apps, schema_editor):
    db_alias = schema_editor.connection.alias

    Suburb = apps.get_model("contacts", "Country")
    State = apps.get_model("contacts", "State")
    Suburb = apps.get_model("contacts", "Suburb")

    states = dict(State.objects.values_list("abbrev", "id"))

    def create_suburb(row):
        return Suburb(state_id=states[row.state], name=row.locality,
                      postcode=row.postcode)

    suburbs = list(map(create_suburb, read_postcode_csv(CSV_FILE)))
    Suburb.objects.using(db_alias).bulk_create(suburbs)


def read_postcode_csv(filename):
    for row in csv.DictReader(open(filename)):
        yield Postcode(state=row["State"], locality=row["Locality"],
                       postcode=row["Pcode"])


def delete_suburbs(apps, schema_editor):
    apps.get_model("contacts", "Suburb").objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('contacts', '0003_initial_data'),
    ]

    operations = [
        migrations.RunPython(load_suburbs, delete_suburbs),
    ]
