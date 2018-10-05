from random import randint
from functools import wraps
from django.apps import apps


def kindred_apps():
    "returns a list of installed kindred django apps"
    return [t for t in apps.get_app_configs()
            if t.name.startswith('kindred.') or t.name.startswith('turtle.')]


def name_list_models():
    from .models import AbstractNameList
    for model in apps.get_models():
        if issubclass(model, AbstractNameList):
            yield model


def init_record_id(id_attr):
    """
    This is a decorator for model save methods to ensure that an "ID"
    field gets saved. The "ID" field is a string doesn't necessarily
    map to the primary key.

    Problem with setting ID string from PK is that the sequence value
    is unknown when saving. It must be set after creating the new
    record.  Also the ID string is unique, so a blank value won't
    necessarily work -- that's why a random number is used.
    """
    def pre_save(self):
        needs_id = not getattr(self, id_attr)
        if needs_id:
            if self.id is not None:
                setattr(self, id_attr, self.make_id(self.id))
                needs_id = False
            else:
                setattr(self, id_attr, "tmp-%d" % randint(0, 2e9))
        return needs_id

    def post_save(self, needs_id):
        if needs_id:
            setattr(self, id_attr, self.make_id(self.id))
            self.save()

    def decorator(m):
        @wraps(m)
        def record_id_save(self, *args, **kwargs):
            needs_id = pre_save(self)
            m(self, *args, **kwargs)
            post_save(self, needs_id)
        return record_id_save

    return decorator


def flatten_dict(d, result=None):
    "Merge dict values of d into d"
    result = result or {}
    for k, v in list(d.items()):
        result[k] = v
        if isinstance(v, dict):
            flatten_dict(v, result)
    return result


def uniq(xs):
    "Returns new list with duplicate items removed."
    seen = set()
    return [x for x in xs if not (x in seen or seen.add(x))]
