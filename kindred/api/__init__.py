import logging

from django.apps import apps
from django.core.urlresolvers import reverse
from django.contrib.contenttypes.models import ContentType

from tastypie.authentication import SessionAuthentication
from tastypie.resources import Resource, Bundle
from tastypie import fields

from ..app.models import AbstractNameList, AbstractNameDescList

from . import app            # noqa
from . import biobank        # noqa
from . import clientlog      # noqa
from . import contacts       # noqa
from . import csv_import     # noqa
from . import diagnosis      # noqa
from . import events         # noqa
from . import people         # noqa
from . import project        # noqa
from . import records        # noqa
from . import reports        # noqa
from . import sp             # noqa
from . import treatment      # noqa
from . import users          # noqa

from ..app.utils import kindred_apps
from .base import v1, make_generic_resource, OrmlessObject


logger = logging.getLogger(__name__)

__all__ = ["v1", "get_api_base"]


def make_subclass_resource(subclass_resource_name, base_cls):
    """assembles and registers resource which will list all
    models in the app which are a subclass of base_cls"""

    subclasses = []
    for model in apps.get_models():
        if issubclass(model, base_cls):
            subclasses.append(model.__name__)
    subclass_info = [OrmlessObject(pk=i, name=name, endpoint=name.lower())
                     for (i, name) in enumerate(sorted(subclasses))]

    class SubclassListResource(Resource):
        pk = fields.CharField('pk')
        name = fields.CharField('name')
        endpoint = fields.CharField('endpoint')

        class Meta:
            resource_name = subclass_resource_name
            object_class = OrmlessObject
            authentication = SessionAuthentication()
            limit = 0
            max_limit = 0
            list_allowed_methods = ["get"]
            detail_allowed_methods = ["get"]

        def get_object_list(self, request):
            return subclass_info

        def obj_get_list(self, request=None, **kwargs):
            return self.get_object_list(request)

        def obj_get(self, request=None, **kwargs):
            return subclass_info[int(kwargs['pk'])]

        def detail_uri_kwargs(self, bundle_or_obj):
            if isinstance(bundle_or_obj, Bundle):
                obj = bundle_or_obj.obj
            else:
                obj = bundle_or_obj
            return {'pk': obj.pk}

        def _build_reverse_url(self, name, args=None, kwargs=None):
            return ""

    v1.register(SubclassListResource())


def get_api_base(api_name="v1"):
    return reverse("api_v1_top_level", kwargs={"api_name": api_name}) + "/"


def parse_resource_uri(resource_uri):
    base = get_api_base()

    if base and resource_uri.startswith(base):
        resource_uri = resource_uri[len(base):]

    parts = resource_uri.rsplit("/", 1)

    pk = None
    content_type = None

    if len(parts) >= 2 and parts[1]:
        pk = parts[1]
        resource = v1.canonical_resource_for(parts[0])
        if resource:
            content_type = ContentType.objects.get_for_model(resource._meta.object_class)

    return content_type, pk


def register_all(django_app):
    for model in django_app.get_models():
        paging = issubclass(model, (AbstractNameList, AbstractNameDescList))
        module_name = "%s.%s" % (__name__, django_app.label)
        make_generic_resource(model, module_name=module_name, paging=paging)

for django_app in kindred_apps():
    register_all(django_app)

make_subclass_resource('abstractnamelist', AbstractNameList)
