Software Installation
---------------------

Web browser
===========

* https://www.google.com/chrome/browser/
* https://www.mozilla.org/firefox/

.. _`barcode-scanner-setup`:

Barcode Scanner Setup
=====================

For Android devices, install the `Barcode Scanner`_ app from the
Google app store.

Set the custom search URL to something like
``https://ccgapps.com.au/demo-turtle/go/%s``, adjusting the part
before ``/go/%s`` to be the home URL of Turtleweb.

.. figure:: images/barcode-scanner-setup.*
   :scale: 30%
   :align: center
   :alt: Barcode scanner setup

   The custom search URL settings for the Barcode Scanner app.

.. _`Barcode Scanner`: https://play.google.com/store/apps/details?id=com.google.zxing.client.android&hl=en_GB


Server Installation
===================

Turtleweb server requires a `PostgreSQL 9.4`_ database (possibly on
another host) and Docker_ for running the web app.

The web app server can run standalone and receive HTTP requests, but
it's probably more convenient to run it behind a reverse proxy server
such as NGINX_.

.. _`PostgreSQL 9.4`: http://www.postgresql.org/docs/9.4/static/release-9-4.html
.. _Docker: https://docker.io/
.. _NGINX: https://www.nginx.com/

PostgreSQL Database setup
~~~~~~~~~~~~~~~~~~~~~~~~~

For a local database, install postgresql 9.4 and fix ``pg_hba.conf``
to allow password logins.

Set up the user and database with the convenience scripts::

    createuser -P turtleweb
    createdb -O turtleweb turtleweb


.. _server-install:

Install procedure
~~~~~~~~~~~~~~~~~

Get a specific version (e.g. :ref:`v0-38-0`)::

    docker pull muccg/turtle:0.38.0


Set up the necessary environment variables in a file::

    # /etc/turtleweb.conf

    # ports to listen on
    HTTP_PORT=8380
    UWSGI_PORT=8300

    # app settings
    SECRETKEY="random text for generating session keys"
    DBSERVER=db.host
    DBNAME=turtleweb
    DBUSER=turtleweb
    DBPASS=turtleweb
    PRODUCTION=1

    # use this if running from a prefix behind a reverse proxy
    # SCRIPT_NAME=/my/turtleweb

Set up a systemd service. If not using systemd, use the given
``ExecStart=`` command after sourcing the environment file. A
reference service file::

    # /etc/systemd/system/turtleweb.service

    [Unit]
    After=docker.service
    Description=Turtleweb application
    Requires=docker.service

    [Service]
    Environment="VERSION=0.38.0"
    EnvironmentFile=/etc/turtleweb.conf
    ExecStart=/usr/bin/docker run --name turtleweb \
      -p $HTTP_PORT:9000 -p $UWSGI_PORT:9100 \
      --env-file /etc/turtleweb.conf \
      -e STATIC_ROOT=/static \
      -e MEDIA_ROOT=/data/media \
      -e ALLOWED_HOSTS=* \
      muccg/turtle:$VERSION

    ExecStartPre=/bin/sh -c 'docker kill turtleweb || true'
    ExecStartPre=/bin/sh -c 'docker rm turtleweb || true'
    ExecStartPre=/usr/bin/docker pull muccg/turtle:$VERSION
    KillSignal=INT
    TimeoutStartSec=0
    TimeoutStopSec=1

Fire up ``turtleweb.service`` with systemd and see if it worked and is
accepting connections on the HTTP port.

Initialize/Update database
~~~~~~~~~~~~~~~~~~~~~~~~~~

Do this after installing a new version::

    docker run --rm --env-file /etc/turtleweb.conf muccg/turtle:0.38.0 bootstrapdb

It will migrate the database tables. Make sure there's a backup before
doing this.

.. _server-upgrade:

Upgrade procedure
~~~~~~~~~~~~~~~~~

Edit the version in the service file and then re-run the
``bootstrapdb`` command (make sure the docker image tag is correct
when running ``bootstrapdb``).


Web server setup
~~~~~~~~~~~~~~~~

An example NGINX_ configuration::

    upstream uwsgi-turtleweb {
     server     127.0.0.1:8300  fail_timeout=10s;
    }

    server {
      listen                80;
      listen                [::]:80;
      server_name           example.com;
      return 301 https://$server_name$request_uri;
    }

    server {
      listen         443 ssl;
      listen         [::]:443 ssl;
      server_name  example.com;

      access_log            /var/log/nginx/access.log combined;
      error_log             /var/log/nginx/error.log;

      include /etc/nginx/my-ssl-setup.conf

      location /my/turtleweb {
        root      /srv/www/my/turtleweb;
        index     index.html;
        rewrite ^/my/turtleweb(/.*) $1 break;

        include   /etc/nginx/uwsgi_params;
        uwsgi_param HTTP_SCRIPT_NAME /my/turtleweb;
        uwsgi_pass uwsgi-turtleweb;
      }
   }
