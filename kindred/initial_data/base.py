from itertools import chain

from django.contrib.sites.shortcuts import get_current_site
from django.utils import timezone
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType

from ..app.utils import name_list_models
from ..users.models import User
from ..biobank.models import ContainerClass
from ..people.models import Title
from ..contacts.models import AddressType
from .util import load_custom_schemas


def load_data(**kwargs):
    load_site()
    load_permissions()
    load_groups()
    load_permission_assignments()
    load_init_users()
    load_basic_things()
    load_biobank_containerclass()
    load_base_schemas()


def load_site():
    site = get_current_site(None)
    site.name = "Turtleweb"
    if site.domain == "example.com":
        site.domain = "ccgapps.com.au"
    site.save()


def load_permissions():
    content_type = ContentType.objects.get_for_model(User)
    Permission.objects.get_or_create(codename="manager",
                                     content_type=content_type,
                                     defaults={"name": "Can Manage Users"})


system_groups = [
    "Administrator",
    "User Manager",
    "Data Analyst",
    "Curator",
    "User",
]


def load_groups():
    for name in User.SPECIAL_GROUPS:
        g, created = Group.objects.get_or_create(name=name)
        g.permissions.clear()


PERMS = [
    ('User Manager', [
        'manager',
        '_user',
        '_userprefs',
    ]),
    ('Data Analyst', [
        # app
        '_customdropdownvalue',
        '_customdropdownlist',
        # project
        '_customdataschema',
        # biobank
        '_container',
        '_containerclass',
        # AbstractNameList perms are granted separately
    ]),
    ('Curator', [
        # biobank
        '_sample',
        '_samplecollection',
        '_samplelocation',
        '_samplesending',
        '_samplesplit',
        'change_samplesubdivision',
        '_samplesubcultured',
        'change_samplesubculturedfrom',
        '_sampleuse',
        '_sampledestroy',
        '_samplemove',
        '_sampleprocessed',
        '_samplefrozenfixed',
        'change_transaction',
        # contacts
        '_contactdetails',
        '_personaddress',
        # events
        '_event',
        # people
        '_person',
        # project
        '_patienthascase',
        '_studyconsent',
        '_studymember',
        '_studygroup',
        # records
        '_fileattachment',
        '_csvtemp',
        # reports
        '_reportfrontpage',
        # treatment
        '_intervention',
        '_treatment',
    ]),
    ('User', [
        # reports
        '_search',
        '_report',
    ]),
]


def load_permission_assignments():
    def three_perms(model):
        return ["%s_%s" % (p, model) for p in ("add", "change", "delete")]

    def name_lists(group_name):
        group = Group.objects.get(name=group_name)
        for model in name_list_models():
            content_type = ContentType.objects.get_for_model(model)
            names = three_perms(content_type.model)
            perms = Permission.objects.filter(content_type=content_type,
                                              codename__in=names)
            group.permissions.add(*perms)

    name_lists("Data Analyst")

    def expand(perms):
        def exp(p):
            return three_perms(p[1:]) if p[0] == '_' else [p]
        return list(chain.from_iterable(map(exp, perms)))

    for group_name, names in PERMS:
        group = Group.objects.get(name=group_name)
        perms = Permission.objects.filter(codename__in=expand(names))
        group.permissions.add(*perms)


def load_users(users):
    for (mail, first, last, level) in users:
        us = User.objects.filter(email__iexact=mail)
        u = us[0] if len(us) else User()
        u.email = mail
        u.first_name = first
        u.last_name = last
        u.is_superuser = False
        u.tokenless_login_allowed = True
        u.last_login = timezone.now()
        if u.pk is None:
            u.set_password(first.lower())
        u.save()

        u.level = level
        u.save()


def load_init_users():
    load_users([
        ("root@localhost", "System", "User", User.LVL_ADMIN),
    ])


def load_basic_things():
    AddressType.objects.get_or_create(name="Home", defaults={"order": 1})
    AddressType.objects.get_or_create(name="Work", defaults={"order": 2})
    Title.objects.get_or_create(name="Mr.", defaults={"order": 2})
    Title.objects.get_or_create(name="Dr.", defaults={"order": 3})

CONTAINER_CLASS = [
    "Location",
    "Freezer",
    "Rack",
    "Box",
]


def load_biobank_containerclass():
    prev_cls = None
    for i, name in enumerate(CONTAINER_CLASS):
        cls, created = ContainerClass.objects.get_or_create(name=name)
        cls.contained_by = prev_cls
        cls.dim = 2 if name == "Box" else 1
        cls.def_width = cls.def_height = 10 if name == "Box" else 0
        cls.save()
        prev_cls = cls


custom_schemas = [{
    "model": "person",
    "schema": {
        "properties": {
            "wa_crn": {
                "type": "string",
                "title": "Cancer Registry Number",
            },
            "umrn": {
                "type": "string",
                "title": "UMRN",
            },
            "wartn_subject_id": {
                "type": "string",
                "title": "ARK PID",
            },
            "cameron_db_id": {
                "type": "string",
                "title": "Cameron's Database ID"
            },
        },
        "required": [],
        "type": "object"
    },
}, {
    "model": "sample",
    "schema": {
        "properties": {
            "ark_id": {
                "type": "text",
                "title": "ARK ID"
            }
        },
        "required": [],
        "type": "object"
    },
}, {
    "model": "studygroup",
    "schema": {},
}, {
    "model": "studyconsent",
    "schema": {
        "properties": {
            "comments": {
                "type": "text"
            }
        },
        "required": [],
        "type": "object"
    },
}, {
    "model": "study",
    "schema": {},
}]


def load_base_schemas():
    load_custom_schemas(custom_schemas)
