from django.contrib.auth.backends import ModelBackend
from django.conf import settings
import logging
import random

from .models import Instance

logger = logging.getLogger(__name__)


class NoTokenBackend(ModelBackend):
    def authenticate(self, email=None, password=None, username=None, **kwargs):
        user = ModelBackend.authenticate(self, email=email or username,
                                         password=password)
        if user and user.tokenless_login_allowed:
            return user
        return None


class OpenOTPBackend(ModelBackend):
    def __init__(self, *args, **kwargs):
        if 'openOTPClient' in kwargs:
            self.openOTPClient = kwargs.pop('openOTPClient')
        else:
            self.openOTPClient = OpenOTPClient()
        ModelBackend.__init__(self, *args, **kwargs)

    def authenticate(self, username=None, password=None, token=None):
        username, domain = extract_domain(username)
        user = ModelBackend.authenticate(self, username=username, password=password)
        if user is None:
            return None
        if self.openOTPClient.login(username, token, domain):
            return user
        return None


class TokenSMSBackend(ModelBackend):
    def authenticate(self, email=None, password=None, session=None, token=None):
        user = ModelBackend.authenticate(self, email=email, password=password)

        if user is not None:
            checker = SMSTokenService(session, user)
            if token:
                return user if checker.check_token(token) else None
            else:
                checker.make_and_send_token()

        return None

TOKEN_DISABLE = False


class TokenService(object):
    def __init__(self, session, user):
        self.session = session
        self.user = user

    def check_token(self, token):
        """
        Compare the provided token code to what's in the user's session.
        """
        stored = self.session.get("token_pin", None)
        return stored and stored == token or (TOKEN_DISABLE and token == "000000")

    def make_and_send_token(self):
        token = self._make_token()

        if TOKEN_DISABLE:
            # debugging short-circuit
            logger.info("Send token %s to user %s" % (token, self.user))
            success = True
        else:
            success = self._send_token(token)

        self.session["token_pin"] = token if success else None
        self.session.save()
        return token if success else None

    @staticmethod
    def _make_token():
        """
        A token is a six-digit random number padded by zeroes.
        """
        return "%06d" % random.randint(0, 999999)

    def _send_token(self, token):
        raise NotImplemented


class SMSTokenService(TokenService):
    def _send_token(self, token):
        """
        SMS the token to the user.
        """
        from twilio.rest import TwilioRestClient
        from twilio import TwilioRestException

        account_sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
        auth_token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
        from_phone_number = getattr(settings, "TWILIO_PHONE_NUMBER", "")
        to_phone_number = self.user.mobile_phone_number

        if not account_sid or not auth_token:
            logger.error("TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER "
                         "are not configured in settings. Token auth can't work.")
            return None

        if not to_phone_number:
            logger.warning("%s tried to log in but doesn't have a mobile phone number." % self.user.email)
            return None

        try:
            # fixme: need to make the REST call asynchronous otherwise
            # users can tell that an sms is being sent.
            client = TwilioRestClient(account_sid, auth_token)

            client.sms.messages.create(
                body=self._make_token_message(token),
                to=to_phone_number, from_=from_phone_number)
        except TwilioRestException:
            logger.exception("Twilio REST API call didn't work.")
            return None
        else:
            return token

    def _make_token_message(self, token):
        app_name = Instance.get_current().title
        address = self.user.get_full_name()[:80]
        return "%s is your pin number for %s, %s." % (token, app_name, address)


def extract_domain(username):
    domain = None
    if '@' in username:
        parts = username.split('@')
        username = '@'.join(parts[:-1])
        domain = parts[-1]
    return username, domain


class OpenOTPClient(object):

    def login(self, username, token, domain=None):
        from suds import Client
        WSDL_URL = settings.OPENOTP_WSDL_URL  # noqa
        WEBSERVICE_URL = settings.OPENOTP_WEBSERVICE_URL  # noqa
        DEFAULT_DOMAIN = settings.OPENOTP_DEFAULT_DOMAIN  # noqa

        if domain is None:
            domain = DEFAULT_DOMAIN

        try:
            client = Client(WSDL_URL, location=WEBSERVICE_URL)
            reply = client.service.openotpLogin(username, domain, None, token)
        except Exception as e:
            logger.error('Error in communication with the OpenOTP server')
            logger.exception(e)
            return False
        return (reply['code'] == 1)


class LocalOpenOTPBackend(OpenOTPBackend):
    def __init__(self, *args, **kwargs):
        kwargs['openOTPClient'] = LocalOpenOTPClient()
        OpenOTPBackend.__init__(self, *args, **kwargs)


class LocalOpenOTPClient(object):
    def login(self, username, token, domain=None):
        return token == '111111'
