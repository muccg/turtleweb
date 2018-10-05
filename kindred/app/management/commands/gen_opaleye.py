import sys
import argparse
from django.core.management.base import AppCommand
from django.apps import apps
from django.db.models import fields


class Command(AppCommand):
    help = "Generate Opaleye types from Django models"
    args = "<app_label.model>..."

    def add_arguments(self, parser):
        parser.add_argument("--output", "-o", help="output file",
                            nargs="?", type=argparse.FileType("w"),
                            default=sys.stdout)

    def handle_all_apps(self, output=sys.stdout, **options):
        for app in apps.get_apps():
            self.handle_app_config(app, output, **options)

    def handle_app_config(self, app_config, output=sys.stdout, **options):
        header = HEADER % {
            "app_title": app_config.label.title(),
            "app_name": app_config.name,
        }
        output.write(header)
        for model in app_config.get_models():
            camel_title = first_lower(model.__name__)
            prefix = camel_title
            template = {
                "model_title": model.__name__,
                "model_name": model._meta.model_name,
                "model_ltitle": camel_title,
                "model_fields_abc": type_params(model._meta.fields),
                "model_fields": type_fields(model._meta.fields, prefix),
                "model_fields_haskell": type_fields_haskell(model._meta.fields),
                "model_fields_pg": type_fields_pg(model._meta.fields),
                "table_name": model._meta.db_table,
                "model_table_def": table_def(model._meta.fields, prefix),
                "model_to_pg": model_to_pg(model._meta.fields, prefix),
                "prefix": prefix,
            }
            output.write(MODEL % template)


def first_lower(s):
    "returns string with first character lowercase"
    return s[0].lower() + s[1:] if s else s

# http://stackoverflow.com/a/4306777


def to_camel(value):
    def camelcase():
        yield str.lower
        while True:
            yield str.capitalize
    c = camelcase()
    return "".join(next(c)(x) if x else '_' for x in value.split("_"))


def record_camel(value, prefix=""):
    prefix = first_lower(prefix) if prefix else ""
    return prefix + to_kebab(value)


def to_kebab(s, prefix=""):
    c = to_camel("%s_%s" % (prefix, s) if prefix else s)
    return c[0].upper() + c[1:] if c else c


def type_param(n):
    return chr(ord('a') + n)


def type_params(fields):
    return " ".join(type_param(n) for n, _ in enumerate(fields))


def type_fields(fields, prefix):
    return "\n  , ".join("_%s :: %s" % (record_camel(field.column, prefix), type_param(n))
                         for (n, field) in enumerate(fields))


def type_fields_haskell(fields):
    return " ".join(haskell_type(field) for field in fields[1:])


def haskell_type(field):
    t = haskell_type_base(field)
    if field.null and t:
        return "(Maybe %s)" % t
    return t


def haskell_type_base(field):
    if isinstance(field, fields.AutoField):
        return None
    elif isinstance(field, (fields.CharField, fields.TextField)):
        return "Text"
    elif isinstance(field, fields.BooleanField):
        return "Bool"
    elif isinstance(field, fields.DateTimeField):
        return "UTCTime"
    elif isinstance(field, fields.DateField):
        return "Day"
    elif isinstance(field, fields.IntegerField):
        return "Int"
    elif isinstance(field, fields.FloatField):
        return "Double"
    elif type(field).__name__ == "JSONField":
        return "Value"
    elif isinstance(field, fields.related.ForeignKey):
        return "%sId" % (field.related_model.__name__)
    else:
        return "Fixme"


def type_fields_pg(fields):
    return " ".join(pg_type(field) for field in fields[1:])


def pg_type(field):
    if isinstance(field, fields.related.ForeignKey):
        suffix = "Nullable" if field.null else ""
        return "%sIdColumn%s" % (field.related_model.__name__, suffix)
    else:
        t = pg_type_base(field)
        if field.null:
            return "(Column (Nullable %s))" % t
        else:
            return "(Column %s)" % t


def pg_type_base(field):
    if isinstance(field, (fields.CharField, fields.TextField)):
        return "PGText"
    elif isinstance(field, fields.BooleanField):
        return "PGBool"
    elif isinstance(field, fields.DateTimeField):
        return "PGTimestamptz"
    elif isinstance(field, fields.DateField):
        return "PGDate"
    elif isinstance(field, fields.IntegerField):
        return "PGInt4"
    elif isinstance(field, fields.FloatField):
        return "PGFloat8"
    elif type(field).__name__ == "JSONField":
        return "PGJsonb"
    else:
        return "PGFixme"


def table_def(fields, prefix):
    return "\n  , ".join("_%s = %s" % (record_camel(field.column, prefix), table_def_field(field))
                         for field in fields[1:])


def table_def_field(field):
    if isinstance(field, fields.related.ForeignKey):
        prefix = "p%sId . %sId $ " % (field.related_model.__name__, field.related_model.__name__)
    else:
        prefix = ""
    return "%srequired \"%s\"" % (prefix, field.column)


def model_to_pg(fields, prefix):
    return "\n  , ".join("_%s = %s" % (record_camel(field.column, prefix), model_to_pg_field(field))
                         for field in fields[1:])


def model_to_pg_field(field):
    if isinstance(field, fields.related.ForeignKey):
        suffix = "Nullable" if field.null else ""
        return "pg%sId%s" % (field.related_model.__name__, suffix)
    else:
        prefix = "maybeToNullable . fmap " if field.null else ""
        return prefix + model_to_pg_field_base(field)


def model_to_pg_field_base(field):
    if isinstance(field, (fields.CharField, fields.TextField)):
        return "pgStrictText"
    elif isinstance(field, fields.BooleanField):
        return "pgBool"
    elif isinstance(field, fields.DateTimeField):
        return "pgUTCTime"
    elif isinstance(field, fields.DateField):
        return "pgDay"
    elif isinstance(field, fields.IntegerField):
        return "pgInt4"
    elif isinstance(field, fields.FloatField):
        return "pgDouble"
    elif type(field).__name__ == "JSONField":
        return "pgValueJSONB"
    else:
        return "pgFixme"

HEADER = """{-# LANGUAGE Arrows                #-}
{-# LANGUAGE ConstraintKinds       #-}
{-# LANGUAGE TemplateHaskell       #-}
{-# LANGUAGE FlexibleContexts      #-}
{-# LANGUAGE FlexibleInstances     #-}
{-# LANGUAGE TypeFamilies          #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE DeriveGeneric         #-}

-- models for %(app_name)s
module Models.%(app_title)s where

import Models.Common
import Models.Ids
"""

MODEL = """
-- %(model_title)s %(table_name)s ----------------------------------------

data %(model_title)s' %(model_fields_abc)s = %(model_title)s
  { %(model_fields)s
  } deriving (Generic, Show)

$(makeLenses ''%(model_title)s')

type %(model_title)s = %(model_title)s' %(model_title)sId %(model_fields_haskell)s

type %(model_title)sInsert = %(model_title)s' (Maybe %(model_title)sId) %(model_fields_haskell)s

type %(model_title)sColumns = %(model_title)s' %(model_title)sIdColumn %(model_fields_pg)s

type %(model_title)sInsertColumns = %(model_title)s' %(model_title)sIdColumnMaybe %(model_fields_pg)s

$(makeAdaptorAndInstance "p%(model_title)s" ''%(model_title)s')

%(model_ltitle)sTable :: Table %(model_title)sInsertColumns %(model_title)sColumns
%(model_ltitle)sTable = Table "%(table_name)s" $ p%(model_title)s %(model_title)s
  { _%(prefix)sId = p%(model_title)sId . %(model_title)sId $ optional "id"
  , %(model_table_def)s
  }

%(model_ltitle)sToPG :: %(model_title)sInsert -> %(model_title)sInsertColumns
%(model_ltitle)sToPG = p%(model_title)s %(model_title)s
  { _%(prefix)sId = const (%(model_title)sId Nothing)
  , %(model_to_pg)s
}

%(model_ltitle)sQuery :: Query %(model_title)sColumns
%(model_ltitle)sQuery = queryTable %(model_ltitle)sTable

%(model_ltitle)sByIdQuery :: %(model_title)sId -> Query %(model_title)sColumns
%(model_ltitle)sByIdQuery id = proc () -> do
  ts <- %(model_ltitle)sByIdQueryArr -< constant id
  returnA -< ts

%(model_ltitle)sByIdQueryArr :: QueryArr %(model_title)sIdColumn %(model_title)sColumns
%(model_ltitle)sByIdQueryArr = proc id -> do
  ts <- %(model_ltitle)sQuery -< ()
  restrict -< ts^.%(model_ltitle)sId .=== id
  returnA -< ts

"""
