from django.http import JsonResponse
from django.views.generic import View
from django import forms
from django.contrib.sites.shortcuts import get_current_site
from django.core.mail import send_mail

from .models import User


class MailAdminsForm(forms.Form):
    email = forms.EmailField()
    msg = forms.CharField()


class MailUserAdmins(View):
    def post(self, request):
        form = MailAdminsForm(request.POST)
        if form.is_valid():
            site = get_current_site(request)
            subject = "[%s] User assistance request" % site.name
            from_email = form.cleaned_data["email"].split("\n", 1)[0]
            msg = """Dear user administrators,

The following message has come from someone requesting assistance
logging into the {name} website at https://{domain}.

The e-mail address provided was {email}. Please contact them before
granting any access to the site.

The message follows.

{name} System

---
{msg}
---
""".format(name=site.name, domain=site.domain, email=from_email, msg=form.cleaned_data["msg"])
            user_admins = User.objects.filter(groups__name="User Manager")
            emails = user_admins.values_list("email", flat=True)
            success = send_mail(subject, msg, from_email, emails)

            return JsonResponse({"success": bool(success)})
        else:
            return JsonResponse({"succes": False, "msg": str(form.errors)})
