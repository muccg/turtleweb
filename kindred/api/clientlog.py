import logging

from tastypie.resources import Resource
from tastypie import fields
from tastypie.exceptions import NotFound

from .base import register, BetterAuthentication
from .serialize import BetterSerializer

logger = logging.getLogger(__name__)


class ClientLog:
    def __init__(self, level="error", msg="", username=None, data=None):
        self.level = level
        self.msg = msg
        self.username = username
        self.data = data or {}

    def write(self):
        extra = {
            "data": self.data,
            "username": self.username,
        }
        logger.log(self.logging_level, self.msg, extra=extra)

    @property
    def logging_level(self):
        # python logging api ftw
        level = logging.getLevelName(self.level.upper())
        return level if isinstance(level, int) else logging.ERROR


@register
class ClientLogResource(Resource):
    """
    A way for authenticated clients to send messages to django log
    handlers.
    """
    level = fields.CharField(attribute="level", default="error")
    msg = fields.CharField(attribute="msg")
    data = fields.DictField(attribute="data", default={})
    username = fields.CharField(attribute="username", null=True)

    class Meta:
        object_class = ClientLog
        authentication = BetterAuthentication()
        serializer = BetterSerializer()
        always_return_data = True
        list_allowed_methods = ["get", "post"]
        detail_allowed_methods = []

    def hydrate_username(self, bundle):
        bundle.data["username"] = getattr(bundle.request.user, "email", None)
        return bundle

    def get_object_list(self, request):
        return []

    def obj_get_list(self, bundle, **kwargs):
        return []

    def obj_get(self, bundle, **kwargs):
        raise NotFound("This is a write-only resource")

    def obj_create(self, bundle, **kwargs):
        bundle.obj = ClientLog()
        bundle = self.full_hydrate(bundle)
        bundle.obj.write()
        return bundle

    def detail_uri_kwargs(self, bundle_or_obj):
        return {}
