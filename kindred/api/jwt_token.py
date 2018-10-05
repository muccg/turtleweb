import jwt
import logging
from time import time

from django.conf import settings

__all__ = ["make_token", "make_token_req", "set_token_cookie"]

logger = logging.getLogger(__name__)


def make_token(user, session=None):
    return jwt_encode({
        "sub": user.email,
        "user_id": user.id,
        "email": user.email,
        "roles": sorted(user.group_names),
        "session_key": session.session_key if session else None,
    })

token_exp = int(getattr(settings, 'SESSION_IDLE_TIMEOUT', 0) or 0)


def jwt_encode(payload):
    algo = getattr(settings, "JWT_ALGORITHM", None) or "HS256"
    iss = getattr(settings, "JWT_ISSUER", None)
    if iss:
        payload["iss"] = iss
    if token_exp:
        payload["exp"] = int(time()) + token_exp
    return jwt.encode(payload, settings.SECRET_KEY, algo)


def make_token_req(request):
    if request.user.is_authenticated():
        return make_token(request.user, request.session)
    return None


def set_token_cookie(response, token):
    """
    Stores auth token in a cookie. This is only used when the browser
    downloads CSV files.
    """
    if token:
        response.set_cookie("auth_token", token, max_age=token_exp,
                            httponly=True)
    else:
        response.delete_cookie("auth_token")
    return response
