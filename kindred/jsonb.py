############################################################################
# This is a backport of the postgresql jsonb function from Django 1.9b1.
# It combines the two modules:
#   django.contrib.postgres.fields.jsonb
#   django.contrib.postgres.lookups

############################################################################
# Django 1.9 -- django.contrib.postgres.fields.jsonb

import json

from psycopg2.extras import Json

from django.core import exceptions
from django.db.models import Field, Transform
from django.utils.translation import ugettext_lazy as _

__all__ = ['JSONField']


class JSONField(Field):
    empty_strings_allowed = False
    description = _('A JSON object')
    default_error_messages = {
        'invalid': _("Value must be valid JSON."),
    }

    def db_type(self, connection):
        return 'jsonb'

    def get_transform(self, name):
        transform = super(JSONField, self).get_transform(name)
        if transform:
            return transform
        return KeyTransformFactory(name)

    def get_prep_value(self, value):
        if value is not None:
            return Json(value)
        return value

    def get_prep_lookup(self, lookup_type, value):
        if lookup_type in ('has_key', 'has_keys', 'has_any_keys'):
            return value
        if isinstance(value, (dict, list)):
            return Json(value)
        return super(JSONField, self).get_prep_lookup(lookup_type, value)

    def validate(self, value, model_instance):
        super(JSONField, self).validate(value, model_instance)
        try:
            json.dumps(value)
        except TypeError:
            raise exceptions.ValidationError(
                self.error_messages['invalid'],
                code='invalid',
                params={'value': value},
            )

    def value_to_string(self, obj):
        value = self.value_from_object(obj)
        return value

    def formfield(self, **kwargs):
        defaults = {'form_class': JSONFormField}
        defaults.update(kwargs)
        return super(JSONField, self).formfield(**defaults)


class KeyTransform(Transform):

    def __init__(self, key_name, *args, **kwargs):
        super(KeyTransform, self).__init__(*args, **kwargs)
        self.key_name = key_name

    def as_sql(self, compiler, connection):
        key_transforms = [self.key_name]
        previous = self.lhs
        while isinstance(previous, KeyTransform):
            key_transforms.insert(0, previous.key_name)
            previous = previous.lhs
        lhs, params = compiler.compile(previous)
        if len(key_transforms) > 1:
            return "{} #> %s".format(lhs), [key_transforms] + params
        try:
            int(self.key_name)
        except ValueError:
            lookup = "'%s'" % self.key_name
        else:
            lookup = "%s" % self.key_name
        return "%s -> %s" % (lhs, lookup), params


class KeyTransformFactory(object):

    def __init__(self, key_name):
        self.key_name = key_name

    def __call__(self, *args, **kwargs):
        return KeyTransform(self.key_name, *args, **kwargs)

############################################################################
# Django 1.9 -- django.contrib.postgres.lookups

from django.db.models import Lookup, Transform  # noqa


class PostgresSimpleLookup(Lookup):

    def as_sql(self, qn, connection):
        lhs, lhs_params = self.process_lhs(qn, connection)
        rhs, rhs_params = self.process_rhs(qn, connection)
        params = lhs_params + rhs_params
        return '%s %s %s' % (lhs, self.operator, rhs), params


class DataContains(PostgresSimpleLookup):
    lookup_name = 'contains'
    operator = '@>'


class ContainedBy(PostgresSimpleLookup):
    lookup_name = 'contained_by'
    operator = '<@'


class Overlap(PostgresSimpleLookup):
    lookup_name = 'overlap'
    operator = '&&'


class HasKey(PostgresSimpleLookup):
    lookup_name = 'has_key'
    operator = '?'


class HasKeys(PostgresSimpleLookup):
    lookup_name = 'has_keys'
    operator = '?&'


class HasAnyKeys(PostgresSimpleLookup):
    lookup_name = 'has_any_keys'
    operator = '?|'


class Unaccent(Transform):
    bilateral = True
    lookup_name = 'unaccent'
    function = 'UNACCENT'

############################################################################
# Django 1.9 -- django.contrib.postgres.fields.jsonb

JSONField.register_lookup(DataContains)
JSONField.register_lookup(ContainedBy)
JSONField.register_lookup(HasKey)
JSONField.register_lookup(HasKeys)
JSONField.register_lookup(HasAnyKeys)

############################################################################
# Django 1.9 -- django.contrib.postgres.forms.jsonb

import json  # noqa

from django import forms  # noqa
from django.utils.translation import ugettext_lazy as _  # noqa


class JSONFormField(forms.CharField):
    default_error_messages = {
        'invalid': _("'%(value)s' value must be valid JSON."),
    }

    def __init__(self, **kwargs):
        kwargs.setdefault('widget', forms.Textarea)
        super(JSONFormField, self).__init__(**kwargs)

    def to_python(self, value):
        if value in self.empty_values:
            return None
        try:
            return json.loads(value)
        except ValueError:
            raise forms.ValidationError(
                self.error_messages['invalid'],
                code='invalid',
                params={'value': value},
            )

    def prepare_value(self, value):
        return json.dumps(value)
