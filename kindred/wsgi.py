# Generic WSGI application for use with CCG Django projects
# Installed by RPM package

import os
import os.path

# snippet to enable the virtualenv
activate_this = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bin', 'activate_this.py')
if os.path.exists(activate_this):
    exec(compile(open(activate_this).read(), activate_this, 'exec'), dict(__file__=activate_this))
del activate_this

webapp_root = os.path.dirname(os.path.abspath(__file__))

# determine app instance (kindred or turtle) based on path to webapp
app_instance = os.path.basename(webapp_root)

# prepare the settings module for the WSGI app
from ccg_django_utils.conf import setup_prod_env  # noqa
setup_prod_env(app_instance, package_name="kindred")

from django.core.wsgi import get_wsgi_application  # noqa
_application = get_wsgi_application()


# This is the WSGI application booter
def application(environ, start):
    if "HTTP_SCRIPT_NAME" in environ:
        environ['SCRIPT_NAME'] = environ['HTTP_SCRIPT_NAME']
        os.environ['SCRIPT_NAME'] = environ['HTTP_SCRIPT_NAME']
    else:
        os.environ['SCRIPT_NAME'] = environ['SCRIPT_NAME']
    if 'DJANGODEV' in environ:
        os.environ['DJANGODEV'] = environ['DJANGODEV']
    return _application(environ, start)
