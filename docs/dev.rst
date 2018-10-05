.. _dev:

Development Documentation
-------------------------

The Turtleweb application comprises of separate backend and frontend
components. The backend is a Python3 Django server. The frontend is a
HTML5 application.

The frontend and backend communicate using a REST API. The backend
stores its data in a PostgreSQL database.

Debian/Ubuntu Package Dependencies
==================================

The Python3 dependencies are installed in a virtualenv with ``pip``
and the Javascript dependencies are installed into a local directory
with ``npm``. This will require a small number of Debian packages
installed::

    sudo apt-get install python3 python3-venv python3-dev \
                         npm nodejs \
                         postgresql-9.4 postgresql-server-dev-9.4


Source Code
===========

The source code is checked into a git repository on Bitbucket::

    cd ~/dev
    git clone git@github.com:muccg/turtleweb.git
    cd turtleweb


Getting Started
===============

Turtleweb is a little different from other CCG apps. To set up the app
and its dependencies, run::

    npm install

To start the development server, run::

    ./node_modules/.bin/gulp serve

Then point your web browser at the URL shown. (http://localhost:3000)

Database Setup
==============

Run commands as postgres user::

  createuser -P turtle
  createdb -O turtle turtle

Then create the database tables::

  ./venv/bin/turtle migrate


Initial data
============

Initial data can be loaded using:

    ./venv/bin/turtle init
    ./venv/bin/turtle init demo

Logging In
==========

After the data is loaded, you can log in with:

+--------------------------------+------------------+--------------+
| **Username**                   | **Password**     | **Data set** |
+--------------------------------+------------------+--------------+
| ``root@localhost``             | ``hello``        | init         |
+--------------------------------+------------------+--------------+
| ``admin@ccg.murdoch.edu.au``   | ``admin``        | init demo    |
+--------------------------------+------------------+--------------+
| ``manager@ccg.murdoch.edu.au`` | ``manager``      | init demo    |
+--------------------------------+------------------+--------------+
| ``analyst@ccg.murdoch.edu.au`` | ``analyst``      | init demo    |
+--------------------------------+------------------+--------------+
| ``curator@ccg.murdoch.edu.au`` | ``curator``      | init demo    |
+--------------------------------+------------------+--------------+
| ``user@ccg.murdoch.edu.au``    | ``user``         | init demo    |
+--------------------------------+------------------+--------------+

Running backend separately
==========================

Normally, gulp will start the Django backend as part of the ``serve``
task. It will proxy API requests through its own HTTP server to the
Django server listening on port 8001.

You can start Django separately with::

    ./venv/bin/turtle runserver 8001

Just start the Django server before ``gulp serve``.

Minified Frontend Code
======================

To test the minified frontend build with a local server, run::

    ./node_modules/.bin/gulp serve:dist

The HTML can appear quite differently when minified because of the
strict HTML5 parser used by the minifier.

The scripts may also get completely broken by minification, if there
are missing dependency injection annotations.

So it's best to test the dist version regularly.

Typescript Dependency injection
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Service and controller classes need to have injection annotations such
as this::

    class MyService {
      public static $inject = ['$location', 'appConfig'];
      constructor(private $location, private appConfig) {
      }
    }

Directive functions defined separated from the ``module.directive()``
statement also need an ``$inject`` attribute.

Easiest way to get this is to put ``// @ngInject`` above the
constructor/function, such as::

    class MyService {
      // @ngInject
      constructor(private $location, private appConfig) {
      }
    }

    // @ngInject
    function myDirective($http): ng.IDirective {
      return { ... };
    }



Testing
=======

There are some token end-to-end tests included::

    ./node_modules/.bin/gulp e2e

To try your luck at the unit tests, use::

    ./node_modules/.bin/gulp test


Documentation
=============

The reStructuredText files with the ``docs`` subdirectory are built
with Sphinx. To see which formats can be generated, run::

    make -C docs

After building something, look in ``docs/_build/html``.

To generate just HTML documentation and copy it into the gulp dist
directory, run::

    ./node_modules/.bin/gulp docs


.. _docker:

Docker information
==================

Releasing Docker containers
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Checkout the repo at the tag/branch you want to release. Replace the
tag name ``unstable`` if you have checked out a release tag.

Build::

  docker build -f Dockerfile-release -t muccg/turtle:unstable .

Publish to private repo on Docker registry::

  docker push muccg/turtle:unstable


Build script (better)
~~~~~~~~~~~~~~~~~~~~~

This is cleaner than a build straight from your git checkout. You can
build from a tag::

    ./scripts/docker-localbuild.sh 0.19.0

Or build from the repo HEAD::

    ./scripts/docker-localbuild.sh build

The docker image will be tagged with the git version (as reported by
``git describe``).


Bamboo Builds
~~~~~~~~~~~~~

Docker build and push is in bamboo under the TTL-APP plan. It will
docker tag the built image using the git tag name (via ``git
describe``).

An example image tag name would be ``muccg/turtle:0.20.0-65-g94ece24``.


Testing Docker Containers
~~~~~~~~~~~~~~~~~~~~~~~~~

For a quick test without using docker-compose, do something like:

    docker run --rm -ti -p 9000:9000 \
        --env DBSERVER=172.17.0.1 --env DBNAME=turtle \
        --env DBUSER=turtle --env DBPASS=turtle turtleweb:latest


Staging deployment
~~~~~~~~~~~~~~~~~~

The staging deployment is quite similar to the production deployment
described below, except that the docker host is
``staging.ccgapps.com.au``.


Production deployment
~~~~~~~~~~~~~~~~~~~~~

This information is current for May 2015.

Dockerhost
++++++++++

There are a number of things to look at. The container runs on an EC2
host which we will call ``dockerhost``::

    # ~/.ssh/config snippet
    Host dockerhost
        Hostname ccg.ccgapps.com.au
        User ubuntu
        IdentityFile ~/.ssh/ccg-syd-ops-2014.pem

After install
~~~~~~~~~~~~~

Initial Data
++++++++++++

Runs django migrations and loads the turtle demo data set::

    docker run --rm demo-turtle bootstrapdb


Site Object
+++++++++++

Login to the admin and ensure the Site object corresponds to the
correct domain. Otherwise, the links will be wrong on e-mails sent by
the system.


Upgrade procedure
~~~~~~~~~~~~~~~~~

Once a docker image for the new version is available, there are a few
steps to update the running app.

Copy database
+++++++++++++

I create a new database for each new version, for three reasons:

1. It makes it easy to roll back migration stuff-ups;
2. backs up user's old data if the tables are getting wiped; and
3. allows rolling back to a previous version without using a django
   reverse migration.

This is done using ``pg_dump`` and ``psql``, connecting to our RDS
host.

Puppet manifest
+++++++++++++++

A couple variables need to be updated in ``turtle.pp``:

1. ``image_tag`` updated to the docker image tag.
2. ``DBNAME`` environment variable changes to new database.

After these changes are done, commit and push the git repo.


Applying the change
+++++++++++++++++++

Login to docker container host on ec2::

    ssh dockerhost

Pull correct version of container::

    docker pull muccg/turtle:0.21.0

Update puppet-environments repo::

    cd /data/puppetmaster/environments && git pull

Get rid of old container::

    docker stop demo-turtle && docker rm demo-turtle

Update sysv init script. This will cause the app container to be
restarted::

    sudo puppet agent -t

View some logs::

    docker logs demo-turtle | less

Run database migrations, etc::

    docker run --rm demo-turtle bootstrapdb

Database design
===============

It's a pretty normal Django database in many respects, but support for
user-defined data needs explanation.

Drop-Down Lists
~~~~~~~~~~~~~~~

The most basic kind of user-defined data. These are all the models
which are derived from ``AbstractNameList`` or
``AbstractNameDescList``.

Custom Drop-Down Lists
~~~~~~~~~~~~~~~~~~~~~~

This is where the user can defined their own list, and the values
which go into it. The user will create model objects of type
``CustomDropDownList``. The values for these lists will be
``CustomDropDownListValue``.

This type of data modelling is often frowned upon by SQL
purists. Perhaps rightly so. Nevertheless it suits us because it's
pretty difficult to allow users to dynamically add new database tables
with Django.

JSON Data
~~~~~~~~~

Some models have a ``data`` field which is a PostgreSQL JSONB
column. Anything can be put into this dictionary and there is no
validation at the database level.

JSON Schema
~~~~~~~~~~~

To enforce some structure on the data at the frontend level, a JSON
schema for each model's ``data`` field is defined in the
``CustomDataSchema`` model.

This is a standard `JSON Schema`_ object with some extensions to
support foreign key references and extra information about how to
display/edit the field in the frontend.

.. _`JSON Schema`: http://json-schema.org/

Event fields
~~~~~~~~~~~~

There is also user-defined data on events. However its schema depends
on the event type. So the ``EventType`` model also has a JSON Schema
attached to it.

File Attachments
~~~~~~~~~~~~~~~~

Files can be uploaded and attached to model instances of any kind
through the ``FileAttachment`` model. It uses Django's
GenericForeignKey_ mechanism.

.. _GenericForeignKey: https://docs.djangoproject.com/en/1.9/ref/contrib/contenttypes/#generic-relations


Updating API Bindings
~~~~~~~~~~~~~~~~~~~~~

After changing the models you should regenerate the TypeScript
interfaces for the frontend. This is done with::

   ./node_modules/.bin/gulp genapi

Then commit the changes to ``genapi.ts`` into git.
