import time
import logging

from django.contrib.auth import authenticate, login, logout, get_user_model
from django.conf.urls import url
from django.contrib.auth import models as auth
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned

from tastypie.utils import trailing_slash
from tastypie.http import HttpUnauthorized, HttpForbidden, HttpNotFound, HttpMultipleChoices
from tastypie import fields
from tastypie.authorization import DjangoAuthorization
from tastypie.exceptions import Unauthorized
import tastypie

from ..users import models as users
from ..app import models as app
from .base import register, accesslog, BaseResource, QueryResource
from ..query import user_query_expr
from .jwt_token import make_token_req, set_token_cookie

from useraudit import models as useraudit

logger = logging.getLogger(__name__)


class UserRestrictAuthorization(DjangoAuthorization):
    """
    This tastypie auth class allows editing of objects only if they
    belong to the user or the user is a user manager/admin.
    Basically, it will allow non-privileged users to update their own
    profile.
    """

    def __init__(self, object_attribute="user_id", user_attribute="id",
                 allow_create=False):
        super().__init__()
        self.object_attribute = object_attribute
        self.user_attribute = user_attribute
        self.allow_create = allow_create

    @staticmethod
    def is_user_manager(user):
        return user.has_perm('users.manager')

    def is_object_owner(self, bundle):
        user = getattr(bundle.request.user, self.user_attribute)
        obj_user = getattr(bundle.obj, self.object_attribute)
        return obj_user is None or user == obj_user

    def _limit_object_list(self, object_list, bundle):
        if not self.is_user_manager(bundle.request.user):
            val = getattr(bundle.request.user, self.user_attribute)
            query = {self.object_attribute: val}
            object_list = object_list.filter(**query)
        return object_list

    def read_list(self, object_list, bundle):
        "Only allow viewing of own objects, unless a user manager"
        object_list = super().read_list(object_list, bundle)
        return self._limit_object_list(object_list, bundle)

    def read_detail(self, object_list, bundle):
        "Only allow viewing of own objects, unless a user manager"
        if super().read_detail(object_list, bundle):
            return (self.is_user_manager(bundle.request.user) or
                    self.is_object_owner(bundle))
        return False

    def update_list(self, object_list, bundle):
        "Only allow updating of own objects, unless a user manager"
        object_list = super().update_list(object_list, bundle)
        return self._limit_object_list(object_list, bundle)

    def update_detail(self, object_list, bundle):
        return self.is_object_owner(bundle) or super().update_detail(object_list, bundle)

    def create_detail(self, object_list, bundle):
        "Only allow object creation if user is a user manager"
        return self.allow_create or self.is_user_manager(bundle.request.user)

    def delete_list(self, object_list, bundle):
        "Can only delete own objects"
        object_list = super().delete_list(object_list, bundle)
        return self._limit_object_list(object_list, bundle)


@register
class GroupResource(BaseResource):

    class Meta(BaseResource.Meta):
        queryset = auth.Group.objects.all()
        filtering = {
            "name": tastypie.constants.ALL,
        }


@accesslog
@register
class UserResource(QueryResource):
    groups = fields.ToManyField(GroupResource, "groups",
                                null=True, full=True, readonly=True)
    level = fields.IntegerField(attribute="level", null=True)

    password = fields.CharField(null=True)
    current_password = fields.CharField(null=True)
    password_change_date = fields.DateTimeField(attribute="password_change_date",
                                                readonly=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = users.User.objects.all()
        fields = ['id', 'email', 'first_name', 'last_name',
                  'is_active', 'is_superuser',
                  'tokenless_login_allowed', 'mobile_phone_number']
        filtering = {
            "is_active": tastypie.constants.ALL,
            "email": tastypie.constants.ALL,
            "groups": tastypie.constants.ALL_WITH_RELATIONS,
        }
        ordering = ["id", "email", "first_name", "last_name",
                    "is_active", "tokenless_login_allowed"]
        authorization = UserRestrictAuthorization("id", "id")

    def full_hydrate(self, bundle):
        bundle.password_checked = self._password_check(bundle)
        return super().full_hydrate(bundle)

    def _password_check(self, bundle):
        auth = False
        d = bundle.data
        if d.get("current_password", ""):
            # fixme: check this doesn't require a token
            email = bundle.request.user.email
            user = authenticate(email=email, password=d["current_password"])
            auth = bool(user)
            if not auth:
                logger.info("API re-authenticate check failed for \"%s\"" % email)
                self.unauthorized_result(Unauthorized("Bad password"))
            del d["current_password"]

        return auth

    @staticmethod
    def _editing_self(bundle):
        return bundle.request.user.id == bundle.data.get("id", None)

    def hydrate_password(self, bundle):
        """
        Only allow changing of own password if current password is
        entered.
        """
        if "password" in bundle.data:
            if (bundle.data["password"] and
                    (bundle.password_checked or not self._editing_self(bundle))):
                bundle.obj.set_password(bundle.data["password"])
            del bundle.data["password"]

        return bundle

    def hydrate_email(self, bundle):
        """
        Only allow changing of own email if current password is entered.
        """
        if not bundle.password_checked and self._editing_self(bundle):
            bundle.data["email"] = bundle.obj.email
        return bundle

    def hydrate_level(self, bundle):
        """
        1. Prevent non-user-managers from changing level.
        2. Disallow setting a higher access level than the logged in user's level.
        3. Prevent demotion of users with a higher level than user.
        """
        d = bundle.data
        permitted = (d["level"] is not None and
                     UserRestrictAuthorization.is_user_manager(bundle.request.user) and
                     d["level"] >= bundle.request.user.level)

        if permitted:
            d["level"] = max(bundle.request.user.level, d["level"])
        else:
            d["level"] = bundle.obj.level

        return bundle

    def json_query(self, q):
        return user_query_expr(q)

    def prepend_urls(self):
        urls = [
            url(r"^(?P<resource_name>%s)/(?P<pk>\w+)/password-reset%s$" %
                (self._meta.resource_name, trailing_slash()),
                self.wrap_view('password_reset'), name="api_password_reset"),
        ]
        urls.extend(super(UserResource, self).prepend_urls())
        return urls

    def password_reset(self, request, **kwargs):
        self.method_check(request, allowed=['post'])
        data = self._get_json_request_data(request)
        deactivate = bool(data.get("deactivate", None))

        basic_bundle = self.build_bundle(request=request)

        try:
            obj = self.cached_obj_get(bundle=basic_bundle, **self.remove_api_resource_names(kwargs))
        except ObjectDoesNotExist:
            return HttpNotFound()
        except MultipleObjectsReturned:
            return HttpMultipleChoices("More than one resource is found at this URI.")

        if deactivate:
            obj.disable_password()

        obj.password_reset()

        return self.create_response(request, {
            'success': True,
        })


@register
class UserSessionResource(BaseResource):
    """
    This API resource handles user login and logout.
    """
    groups = fields.ToManyField("kindred.api.users.GroupResource", "groups",
                                null=True, full=True)
    level = fields.IntegerField("level", readonly=True, null=True)
    password_change_date = fields.DateTimeField(attribute="password_change_date",
                                                readonly=True, null=True)

    class Meta(BaseResource.Meta):
        fields = ['id', 'email', 'first_name', 'last_name',
                  'is_active', 'is_staff', 'is_superuser',
                  'tokenless_login_allowed', 'mobile_phone_number']
        allowed_methods = ['get', 'post']
        resource_name = 'usersession'
        queryset = users.User.objects.all()

    def get_object_list(self, request):
        return super(UserSessionResource, self).get_object_list(request).filter(id=request.user.id)

    def get_resource_uri(self, bundle_or_obj=None, url_name='api_dispatch_list'):
        """
        Forces the resource URI of the logged in user to point to the user
        resource.
        """
        if bundle_or_obj is not None:
            kwargs = self.resource_uri_kwargs(bundle_or_obj)
            kwargs["resource_name"] = "user"
            return self._build_reverse_url("api_dispatch_detail", kwargs=kwargs)
        return super(UserSessionResource, self).get_resource_uri(bundle_or_obj, url_name)

    def prepend_urls(self):
        return [
            url(r"^(?P<resource_name>%s)/login%s$" %
                (self._meta.resource_name, trailing_slash()),
                self.wrap_view('login'), name="api_login"),
            url(r"^(?P<resource_name>%s)/ping%s$" %
                (self._meta.resource_name, trailing_slash()),
                self.wrap_view('ping'), name="api_ping"),
            url(r'^(?P<resource_name>%s)/logout%s$' %
                (self._meta.resource_name, trailing_slash()),
                self.wrap_view('logout'), name='api_logout'),
        ]

    def login(self, request, **kwargs):
        self.method_check(request, allowed=['post'])

        data = self._get_json_request_data(request)

        username_field = get_user_model().USERNAME_FIELD
        username = data.get(username_field, '')
        password = data.get('password', '')
        token = str(data.get('token', '')).strip()

        user = authenticate(**{
            username_field: username,
            "password": password,
            "token": token,
            "session": request.session,
        })

        if user:
            if user.is_active:
                request.session.clear()
                login(request, user)
                return self.create_success_response(request)
            else:
                return self.create_failure_response(request, {
                    'reason': 'disabled',
                }, HttpForbidden)
        else:
            return self.create_failure_response(request, {
                'reason': 'incorrect' if token or not username or not password else 'token',
            }, HttpUnauthorized)

    def create_success_response(self, request, idle=None):
        data = {
            "success": True,
            "token": make_token_req(request),
        }

        if idle is not None:
            data["idle"] = idle

        response = self.create_response(request, data)
        set_token_cookie(response, data["token"])
        return response

    def create_failure_response(self, request, data, *args, **kwargs):
        data["success"] = False
        return self.create_response(request, data, *args, **kwargs)

    def ping(self, request, **kwargs):
        """
        Client pings serve two purposes:
        1. Client notification if the server can't be reached.
        2. Deleting the session if:
           a. the client reports it has been idle for longer than the
              timeout period.
           b. the api hasn't received a ping during the timeout period.
        A middleware checks the session at next request and logs out idle users.
        """
        self.method_check(request, allowed=['put'])
        data = self._get_json_request_data(request)
        try:
            idle = max(int(data.get("idle", 0)), 0)
        except ValueError:
            idle = 0
        now = int(time.time())
        last_activity = now - idle

        request.session["last_activity"] = max(request.session.get("last_activity", 0),
                                               last_activity)
        idle = now - request.session["last_activity"]

        if request.user and request.user.is_authenticated():
            return self.create_success_response(request, idle=idle)
        else:
            return self.create_failure_response(request, {
                "idle": idle,
            }, HttpUnauthorized)

    def logout(self, request, **kwargs):
        self.method_check(request, allowed=['get'])
        if request.user and request.user.is_authenticated():
            logout(request)
            return self.create_response(request, {'success': True})
        else:
            return self.create_response(request, {'success': False}, HttpUnauthorized)


class BriefUserResource(UserResource):
    """
    A user resource for embedding in other resources.
    This resource doesn't have a registered endpoint.
    """
    class Meta(UserResource.Meta):
        fields = ["id", "first_name", "last_name", "email"]
        resource_name = "user"


@accesslog
@register
class UserPrefsResource(BaseResource):
    prefs = fields.DictField(attribute="prefs", blank=True, null=True)

    class Meta(BaseResource.Meta):
        queryset = users.UserPrefs.objects.all()
        authorization = UserRestrictAuthorization(allow_create=True)

    def obj_create(self, bundle, **kwargs):
        return super(UserPrefsResource, self).obj_create(bundle, user=bundle.request.user)


@register
class AccessLogResource(BaseResource):
    resource_name = fields.CharField("resource_name", readonly=True)
    modified_by = fields.ForeignKey("kindred.api.users.UserResource", "modified_by")

    class Meta(BaseResource.Meta):
        queryset = app.AccessLog.objects.order_by("-modified_on").select_related("content_type")
        filtering = {
            "modified_by": tastypie.constants.ALL,
            "action": tastypie.constants.ALL,
            "content_type": tastypie.constants.ALL_WITH_RELATIONS,
        }

        # Only allow viewing of own logs, unless a user manager
        authorization = UserRestrictAuthorization("modified_by_id")


class UserLogResource(BaseResource):

    class Meta(BaseResource.Meta):
        filtering = {
            "username": tastypie.constants.ALL,
            "timestamp": tastypie.constants.ALL,
        }

        # Only allow viewing of own logs, unless a user manager
        authorization = UserRestrictAuthorization("username", "email")


@register
class LoginLogResource(UserLogResource):

    class Meta(UserLogResource.Meta):
        queryset = useraudit.LoginLog.objects.all()


@register
class FailedLoginLogResource(UserLogResource):

    class Meta(UserLogResource.Meta):
        queryset = useraudit.FailedLoginLog.objects.all()
