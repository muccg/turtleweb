import time
import logging

from django.conf import settings
from django.contrib.auth import logout, get_user_model

logger = logging.getLogger(__name__)

__all__ = ["SessionExpiredMiddleware"]


class SessionExpiredMiddleware(object):
    """
    Middleware that logs out a user if they have been inactive for too
    long.

    The API ping view also sets the last_activity session attribute
    based upon idle time reported by client. Any other ajax call from
    the client won't update the last_activity session attribute.
    """
    def process_request(self, request):
        idle_timeout = self.get_session_idle_timeout()

        if idle_timeout > 0:
            return self.check_idle_timeout(request, idle_timeout)

    def check_idle_timeout(self, request, idle_timeout):
        try:
            last_activity = int(request.session.get("last_activity", 0))
        except ValueError:
            last_activity = 0

        now = int(time.time())

        if not request.is_ajax():
            request.session["last_activity"] = now

        idle = now - last_activity if last_activity != 0 else 0

        if request.user.is_authenticated() and idle > idle_timeout:
            username = self.get_username(request)
            logout(request)
            logger.info("User \"%s\" logged out due to %d seconds inactivity" % (username, idle))

    def get_session_idle_timeout(self):
        return int(getattr(settings, 'SESSION_IDLE_TIMEOUT', 0) or 0)

    def get_username(self, request):
        user_model = get_user_model()
        return getattr(request.user, user_model.USERNAME_FIELD)
