import json
from django.conf import settings
from django.core.urlresolvers import reverse
from django.http import HttpResponse, JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.generic import View, TemplateView

from .. import __version__
from .models import Instance
from ..api import get_api_base
from ..people.models import Person
from ..biobank.models import Sample
from ..events.models import Event
from ..project.models import Study
from ..api.jwt_token import make_token_req, set_token_cookie


class Home(TemplateView):
    template_name = "index.html"

    def get_context_data(self, **kwargs):
        # Call the base implementation first to get a context
        context = super(Home, self).get_context_data(**kwargs)
        context["body_template"] = "%s.html" % Instance.get_current().code
        context["instance"] = Instance.get_current()
        context["user"] = self.request.user
        context["version"] = __version__
        return context


class Config(View):
    @never_cache
    def get(self, request, *args, **kwargs):
        context = self.get_context_data(**kwargs)
        return self.render_to_response(context)

    @classmethod
    def as_view(cls):
        return ensure_csrf_cookie(super().as_view())

    def get_context_data(self, **kwargs):
        return {
            "user": json.loads(_get_user_json(self.request)),
            "jwt_auth_token": self.jwt_auth_token(),
            "csrf_header_name": "X-CSRFToken",
            "csrf_cookie_name": settings.CSRF_COOKIE_NAME,
            "session_cookie_name": settings.SESSION_COOKIE_NAME,
            "session_ping_interval": getattr(settings, "SESSION_PING_INTERVAL", None) or 0,
            "session_idle_timeout": getattr(settings, "SESSION_IDLE_TIMEOUT", None) or 0,
            "password_expiry_days": getattr(settings, "PASSWORD_EXPIRY_DAYS", None) or 0,
            "password_expiry_warning_days": getattr(settings, "PASSWORD_EXPIRY_WARNING_DAYS", None) or 0,
            "version": __version__,
            "instance": Instance.get_current_dict(),
            "api_base": get_api_base(),
            "production": bool(getattr(settings, "PRODUCTION", 0)),
            "urls": {
                "base": reverse("home"),
                "static": settings.STATIC_URL,
                "admin": reverse("admin:index"),
                "explorer": reverse("explorer_index"),
                "questionnaire_app": settings.QUESTIONNAIRE_APP_SITE_URI,
                "madeline_tsv": reverse('madeline-tsv', kwargs={"family_group_id": 0}),
                "madeline_svg": reverse('madeline-svg', kwargs={"family_group_id": 0}),
                "madeline_json": reverse('madeline-json', kwargs={"family_group_id": 0}),
                "sample_label": reverse("sample-label", kwargs={"sample_id": 0}),
                "sample_qrcode": reverse("sample-qrcode", kwargs={"sample_id": 0}),
                "sample_labels_print": reverse("sample-labels-print"),
                "file_upload": reverse("file-upload"),
                "csv_upload": reverse("csv-upload"),
                "csv_download": reverse("csv-download", kwargs={"model": "person"}),
                "id_lookup": reverse("id-lookup", kwargs={"id": "0"})[:-1],
                "password_reset": reverse("password_reset"),
                "mail_user_admins": reverse("mail-user-admins"),
                "docs": getattr(settings, "DOCS_URL", ""),
            }
        }

    def jwt_auth_token(self):
        token = make_token_req(self.request)
        return token.decode() if token else None

    def render_to_response(self, context):
        response = HttpResponse(json.dumps(context),
                                content_type='application/json')
        set_token_cookie(response, context["jwt_auth_token"])
        return response


def _get_user_json(request):
    if request.user.is_authenticated():
        from ..api.users import UserResource
        ur = UserResource()
        bundle = ur.build_bundle(obj=request.user, request=request)
        return ur.serialize(None, ur.full_dehydrate(bundle), 'application/json')
    else:
        return "null"


class IDLookup(View):
    def get(self, request, id=""):
        if id:
            patient = Person.objects.filter(patient_id=id)
            sample = Sample.objects.filter(specimen_id=id)
            event = Event.objects.filter(ident=id)

            if len(patient) > 0:
                data = {
                    "resource": "person",
                    "id": patient[0].id,
                    "study": Study.get_for(patient[0]),
                }
            elif len(sample) > 0:
                data = {
                    "resource": "sample",
                    "id": sample[0].id,
                    "study": Study.get_for(sample[0].get_owner()),
                }
            elif len(event) > 0:
                data = {
                    "resource": "person",
                    "id": event[0].person.id,
                    "study": Study.get_for(event[0].person),
                }
            else:
                data = {
                    "resource": None,
                    "id": None,
                    "study": None,
                }

            data["study"] = data["study"].slug if data["study"] else None
        else:
            data = {}

        return JsonResponse(data)
