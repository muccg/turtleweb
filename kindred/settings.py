import os
import os.path
from ccg_django_utils.conf import EnvConfig

env = EnvConfig()

SCRIPT_NAME = env.get("script_name", os.environ.get("HTTP_SCRIPT_NAME", ""))
FORCE_SCRIPT_NAME = env.get("force_script_name", "") or SCRIPT_NAME or None

WEBAPP_ROOT = os.environ.get("WEBAPP_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CCG_WRITABLE_DIRECTORY = env.get("writable_directory", os.path.join(WEBAPP_ROOT, "scratch"))
PRODUCTION = env.get("production", False)

SECURE_SSL_REDIRECT = env.get("ssl_redirect", PRODUCTION)

# set debug, see: https://docs.djangoproject.com/en/dev/ref/settings/#debug
DEBUG = env.get("debug", not PRODUCTION)

APP_INSTANCE = env.get("app_instance", "turtle")

DATABASES = {
    'default': {
        'ENGINE': env.get_db_engine("dbtype", "pgsql"),
        'NAME': env.get("dbname", APP_INSTANCE),
        'USER': env.get("dbuser", APP_INSTANCE),
        'PASSWORD': env.get("dbpass", APP_INSTANCE),
        'HOST': env.get("dbserver", ""),
        'PORT': env.get("dbport", ""),
    }
}

# Hosts/domain names that are valid for this site; required if DEBUG is False
# See https://docs.djangoproject.com/en/1.5/ref/settings/#allowed-hosts
ALLOWED_HOSTS = env.getlist("allowed_hosts", ["localhost"])

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# In a Windows environment this must be set to your system time zone.
TIME_ZONE = env.get("time_zone", "Australia/Perth")

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/var/www/example.com/media/"
MEDIA_ROOT = env.get('media_root', os.path.join(WEBAPP_ROOT, "upload"))

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://example.com/media/", "http://media.example.com/"
MEDIA_URL = '{0}/upload/'.format(SCRIPT_NAME)

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/var/www/example.com/static/"
STATIC_ROOT = env.get('static_root', os.path.join(WEBAPP_ROOT, "static"))

# URL prefix for static files.
# Example: "http://example.com/static/", "http://static.example.com/"
STATIC_URL = '{0}/static/'.format(SCRIPT_NAME)

LOGIN_REDIRECT_URL = "home"
LOGIN_URL = "home"

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = env.get("secret_key", "changeme")

MIDDLEWARE_CLASSES = (
    'useraudit.middleware.RequestToThreadLocalMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'reversion.middleware.RevisionMiddleware',
    'kindred.app.middleware.SessionExpiredMiddleware',
)

ROOT_URLCONF = 'kindred.urls'

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "APP_DIRS": True,
    "OPTIONS": {
        "context_processors": [
            "django.contrib.auth.context_processors.auth",
            "django.template.context_processors.debug",
            "django.template.context_processors.i18n",
            "django.template.context_processors.media",
            "django.template.context_processors.static",
            "django.template.context_processors.tz",
            "django.contrib.messages.context_processors.messages",
        ],
    },
}]

INSTALLED_APPS = (
    'explorer',
    'kindred',
    'kindred.app',
    'kindred.biobank',
    'kindred.contacts',
    'kindred.diagnosis',
    'kindred.events',
    'kindred.people',
    'kindred.project',
    'kindred.query',
    'kindred.records',
    'kindred.reports',
    'kindred.sp',
    'kindred.treatment',
    'kindred.users',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_extensions',
    'tastypie',
    'useraudit',
    'reversion',
)

AUTH_USER_MODEL = 'users.User'
AUTH_USER_MODEL_PASSWORD_CHANGE_DATE_ATTR = "password_change_date"

# How long a user's password is good for. None or 0 means no expiration.
PASSWORD_EXPIRY_DAYS = env.get("password_expiry_days", 180)
# How long before expiry will the frontend start bothering the user
PASSWORD_EXPIRY_WARNING_DAYS = env.get("password_expiry_warning_days", 30)

AUTHENTICATION_BACKENDS = (
    'useraudit.password_expiry.AccountExpiryBackend',
    'kindred.app.backends.NoTokenBackend',
    'kindred.app.backends.TokenSMSBackend',
    'useraudit.backend.AuthFailedLoggerBackend'
)

# These details for SMS token auth are available at
# https://www.twilio.com/user/account
TWILIO_ACCOUNT_SID = env.get("twilio_account_sid", "")
TWILIO_AUTH_TOKEN = env.get("twilio_auth_token", "")
TWILIO_PHONE_NUMBER = env.get("twilio_phone_number", "")

# How many seconds the client should wait between pings
SESSION_PING_INTERVAL = env.get("session_ping_interval", 60)
# How many seconds of idle time before logging out the user. If zero,
# there is no timeout.
SESSION_IDLE_TIMEOUT = env.get("session_idle_timeout", 600)

# Questionnaire app configuration.
# The APP_URI is the uri used to communicate with the API of the app.
# The SITE URI is the public URI that will get sent out to patients.

QUESTIONNAIRE_APP_URI = env.get("questionnaire_app_uri", "http://172.16.2.194:8000/")
QUESTIONNAIRE_APP_SITE_URI = env.get("questionnaire_app_site_uri", QUESTIONNAIRE_APP_URI)
QUESTIONNAIRE_APP_API_SECRET_KEY = env.get("questionnaire_app_api_secret_key", "changeme_big_secret")

# Configures where the help link points to
DOCS_URL = env.get("docs_url", "/docs/guide.html")

# Default cookie settings
# see: https://docs.djangoproject.com/en/1.7/ref/settings/#session-cookie-age and following
# see: https://docs.djangoproject.com/en/1.7/ref/settings/#csrf-cookie-name and following
SESSION_COOKIE_AGE = env.get("session_cookie_age", 60 * 60)
SESSION_COOKIE_PATH = '{0}/'.format(SCRIPT_NAME)
SESSION_SAVE_EVERY_REQUEST = env.get("session_save_every_request", True)
SESSION_COOKIE_HTTPONLY = env.get("session_cookie_httponly", True)
SESSION_COOKIE_SECURE = env.get("session_cookie_secure", SECURE_SSL_REDIRECT)
SESSION_COOKIE_NAME = env.get("session_cookie_name", "kindred_{0}".format(SCRIPT_NAME.replace("/", "")))
SESSION_COOKIE_DOMAIN = env.get("session_cookie_domain", "") or None
CSRF_COOKIE_NAME = env.get("csrf_cookie_name", "csrf_{0}".format(SESSION_COOKIE_NAME))
CSRF_COOKIE_DOMAIN = env.get("csrf_cookie_domain", "") or SESSION_COOKIE_DOMAIN
CSRF_COOKIE_PATH = env.get("csrf_cookie_path", SESSION_COOKIE_PATH)
CSRF_COOKIE_SECURE = env.get("csrf_cookie_secure", SECURE_SSL_REDIRECT)

APPEND_SLASH = False
TASTYPIE_ALLOW_MISSING_SLASH = True
TASTYPIE_DEFAULT_FORMATS = ['json']
TASTYPIE_FULL_DEBUG = True

SESSION_SERIALIZER = 'django.contrib.sessions.serializers.JSONSerializer'

SILENCED_SYSTEM_CHECKS = ["models.E006", "1_6.W001"]

# This honours the X-Forwarded-Host header set by our nginx frontend when
# constructing redirect URLS.
# see: https://docs.djangoproject.com/en/1.4/ref/settings/#use-x-forwarded-host
USE_X_FORWARDED_HOST = env.get("use_x_forwarded_host", True)

if env.get("memcache", ""):
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.memcached.MemcachedCache',
            'LOCATION': env.getlist("memcache", []),
            'KEY_PREFIX': env.get("key_prefix", APP_INSTANCE),
        }
    }

    SESSION_ENGINE = "django.contrib.sessions.backends.cache"
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        }
    }

    SESSION_ENGINE = 'django.contrib.sessions.backends.db'
    SESSION_FILE_PATH = CCG_WRITABLE_DIRECTORY


if env.get("email_host", ""):
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = env.get("email_host", "localhost")
    EMAIL_PORT = env.get("email_port", 25)
    EMAIL_HOST_USER = env.get("email_host_user", "")
    EMAIL_HOST_PASSWORD = env.get("email_host_password", "")
    EMAIL_USE_TLS = env.get("email_use_tls", False)
    EMAIL_USE_SSL = env.get("email_use_tls", False)
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

EMAIL_SUBJECT_PREFIX = "[%s] " % APP_INSTANCE
SERVER_EMAIL = env.get("server_email", "root@localhost")
DEFAULT_FROM_EMAIL = env.get("default_from_email", "webmaster@localhost")

ADMINS = (
    ("%s Admin" % APP_INSTANCE, env.get("admin_email", "root@localhost")),
)

MANAGERS = ADMINS

CCG_LOG_DIRECTORY = env.get('log_directory', os.path.join(WEBAPP_ROOT, "log"))
try:
    if not os.path.exists(CCG_LOG_DIRECTORY):
        os.mkdir(CCG_LOG_DIRECTORY)
except:
    pass
os.path.exists(CCG_LOG_DIRECTORY), "No log directory, please create one: %s" % CCG_LOG_DIRECTORY

MADELINE2_PROG = "/usr/bin/madeline2"

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[%(name)s:%(levelname)s:%(asctime)s:%(filename)s:%(lineno)s:%(funcName)s] %(message)s'
        },
        'db': {
            'format': '[%(name)s:%(duration)s:%(sql)s:%(params)s] %(message)s'
        },
        #        'syslog': {
        #            'format': 'kindred: %(name)s:%(levelname)s %(message)s'
        #        },
        'simple': {
            'format': '%(levelname)s %(filename)s:%(lineno)s (%(funcName)s)  %(message)s'
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        'shell': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple'
        },
        'file': {
            'level': 'INFO',
            'class': 'ccg_django_utils.loghandlers.ParentPathFileHandler',
            'filename': os.path.join(CCG_LOG_DIRECTORY, '%s.log' % APP_INSTANCE),
            'when': 'midnight',
            'formatter': 'verbose'
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'filters': ['require_debug_false']
        },
        'logstash': {
            'level': 'DEBUG',
            'class': 'logstash.UDPLogstashHandler',
            'host': env.get("LOGSTASH_HOST", "localhost"),
            'port': env.get("LOGSTASH_PORT", 5959),
            'version': 1,
            'message_type': 'json',  # logstash "type" field
            'fqdn': False,
            'tags': ["django", APP_INSTANCE],
        },
        'null': {
            'class': 'logging.NullHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file', 'logstash'],
        },
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'django.security': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'django.db.backends': {
            'handlers': ['mail_admins'],
            'level': 'CRITICAL',
            'propagate': True,
        },
        'kindred': {
            'handlers': ['console', 'file', 'logstash'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'migrate': {
            'handlers': ['shell'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'oldmodels': {
            'handlers': ['shell'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'py.warnings': {
            'handlers': ['console'],
        },
    }
}
