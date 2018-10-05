# -*- coding: utf-8 -*-


from django.db import models, migrations


def initial_data(apps, schema_editor):
    User = apps.get_model("users", "User")
    system_id = 1
    u = User(is_superuser=True,
             first_name="System", last_name="User",
             tokenless_login_allowed=True, email="root@localhost",
             created_by_id=system_id, modified_by_id=system_id,
             password="pbkdf2_sha256$10000$SYAewjA5ItEy$bUR0XufI4h0YuLHu9ltf9ZPIYJG63sKDxhxT01K4dnA=")
    u.save()


def initial_data_reverse(apps, schema_editor):
    apps.get_model("users", "User").objects.all().delete()



class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('people', '0002_initial_data'),
    ]

    operations = [
        migrations.RunPython(initial_data, initial_data_reverse),
    ]
