# -*- coding: utf-8 -*-


from django.db import models, migrations

def forwards_func(apps, schema_editor):
    Instance = apps.get_model("app", "Instance")
    db_alias = schema_editor.connection.alias
    Instance.objects.using(db_alias).bulk_create([
        Instance(code="kindred", title="KINDRED"),
        Instance(code="turtle", title="Turtleweb"),
    ])

def backwards_func(apps, schema_editor):
    Instance = apps.get_model("app", "Instance")
    db_alias = schema_editor.connection.alias
    Instance.objects.using(db_alias).all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0002_auto_20150803_1425'),
    ]

    operations = [
        migrations.RunPython(forwards_func, backwards_func)
    ]
