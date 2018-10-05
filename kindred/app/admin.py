import re
from django.contrib import admin
from django.contrib.admin.sites import AlreadyRegistered, NotRegistered
from reversion.admin import VersionAdmin
from .utils import kindred_apps
from . import models as m
from ..contacts import models as contacts
from ..people import models as people
from ..sp import models as sp
from ..users import models as users
# import tastypie admin to force load, so we can unregister
# some of its models
import tastypie.admin as tastypie_admin  # noqa
from tastypie.models import ApiKey


def register(*model_classes):
    "Admin class decorator for registering it with one or more model classes"
    def admin_register(admin_cls):
        # fixme: something is choking in admin
        # for model_cls in model_classes:
        #     admin.site.register(model_cls, admin_cls)
        return admin_cls
    return admin_register


class ContactDetailsInline(VersionAdmin, admin.StackedInline):
    model = contacts.ContactDetails


def full_name(u):
    return u.get_full_name()


@register(users.User)
class UserAdmin(admin.ModelAdmin):
    full_name.short_description = "Name"
    list_display = ('email', 'last_name', 'first_name',
                    'is_active', 'is_superuser', 'tokenless_login_allowed')
    ordering = ['last_name', 'first_name']
    list_filter = ['is_active', 'is_superuser']
    fields = ('email', 'password', 'last_name', 'first_name',
              'is_active', 'is_superuser', 'tokenless_login_allowed')


@register(people.Person)
class PersonAdmin(VersionAdmin, admin.ModelAdmin):
    list_display = ('id', 'last_name', 'first_name', 'sex', 'dob', 'dod')
    ordering = ['last_name', 'first_name']
    list_filter = ["sex", "born", "deceased"]
    search_fields = ['last_name', 'first_name']
    # inlines = [ContactDetailsInline]

    # the django admin is way too slow to display the options
    raw_id_fields = ("mother", "father")

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "mother":
            kwargs["queryset"] = people.Person.objects.filter(sex="F")
        elif db_field.name == "father":
            kwargs["queryset"] = people.Person.objects.filter(sex="M")

        return super(PersonAdmin, self).formfield_for_foreignkey(db_field, request, **kwargs)

    def formfield_for_manytomany(self, db_field, request, **kwargs):
        if db_field.name == "twins":
            person = self.get_admin_object(request, people.Person)
            if person:
                q = people.Person.objects.exclude(id=person.id)
                q = q.exclude(mother__isnull=True).exclude(father__isnull=True)
                q = q.filter(mother=person.mother, father=person.father)
                kwargs["queryset"] = q
        return super(PersonAdmin, self).formfield_for_manytomany(db_field, request, **kwargs)

    def get_admin_object(self, request, model):
        try:
            # fixme: maybe get rid of this
            object_id = int(re.findall('\d+', request.META['PATH_INFO'])[0])
        except ValueError:
            return None
        except IndexError:
            return None
        return model.objects.get(pk=object_id)


@register(sp.Doctor)
class DoctorAdmin(PersonAdmin):
    list_display = ('id', 'title', 'last_name', 'first_name', 'type', 'active', 'gp_number')
    ordering = ['last_name', 'first_name']
    list_filter = ['active', 'type']


class FamilyMemberInline(VersionAdmin, admin.StackedInline):
    model = people.FamilyMember


def family_num_members(obj):
    return obj.members.count()
family_num_members.short_description = "Members"


@register(people.FamilyGroup)
class FamilyGroupAdmin(VersionAdmin, admin.ModelAdmin):
    inlines = [FamilyMemberInline]
    list_display = ['desc', family_num_members]


@register(m.IDMap)
class IDMapAdmin(admin.ModelAdmin):
    list_display = ('from_table', 'to_table', 'oldid', 'newid')
    list_filter = ["from_table"]
    search_fields = ["newid"]
    ordering = ["from_table", "newid"]


class NameListAdmin(admin.ModelAdmin):
    list_display = ('order', 'name', 'default')
    # list_editable = ('name',)
    search_fields = ["name"]


class NameDescListAdmin(admin.ModelAdmin):
    list_display = ('order', 'name', 'desc', 'default')
    # list_editable = ('name', 'desc')
    search_fields = ["name", "desc"]


class SatelliteAdmin(admin.ModelAdmin):
    raw_id_fields = ("person",)


@register(m.AccessLog)
class AccessLogAdmin(admin.ModelAdmin):
    list_filter = ('modified_by', 'ip_address', 'content_type')
    ordering = ('-modified_on',)
    list_display = ('modified_on', 'modified_by', 'ip_address', 'content_type', 'action')
    # We're co-opting admin for viewing access logs, so we need this model
    # registered but read only. Admin doesn't quite offer that.
    # readonly_fields gives us something of a has_view_permission in admin
    # but we can still see a save button that doesn't work
    readonly_fields = (
        'action', 'modified_by', 'modified_on', 'ip_address',
        'content_type', 'resource_repr')

    # Removes the "Add Access Log" button in admin
    def has_add_permission(self, request):
        return False

    # Removes the delete button in admin
    def has_delete_permission(self, request, obj=None):
        return False


def register_all(django_app):
    """
    Gets all models in the app and registers them with a suitable
    admin class if they aren't already registered.
    """
    for model in django_app.get_models():
        if issubclass(model, m.AbstractNameDescList):
            admin_cls = NameDescListAdmin
        elif issubclass(model, m.AbstractNameList):
            admin_cls = NameListAdmin
        elif any(f.name == "person" for f in model._meta.fields):
            admin_cls = SatelliteAdmin
        else:
            admin_cls = admin.ModelAdmin

        try:
            admin.site.register(model, admin_cls)
        except AlreadyRegistered:
            pass


for django_app in kindred_apps():
    register_all(django_app)

try:
    admin.site.unregister(ApiKey)
except NotRegistered:
    pass
