#!/bin/bash


# wait for a given host:port to become available
#
# $1 host
# $2 port
function dockerwait {
    while ! exec 6<>/dev/tcp/$1/$2; do
        echo "$(date) - waiting to connect $1 $2"
        sleep 5
    done
    echo "$(date) - connected to $1 $2"

    exec 6>&-
    exec 6<&-
}

# wait until postgres is up answering queries.
# on an unclean restart it'll come up, but will
# error any queries made in the first few seconds
function postgreswait {
    if hash psql 2>/dev/null; then
        while ! echo "select 1;" | PGPASSWORD="$DBPASS" psql -h "$DBSERVER" -p "$DBPORT" -U "$DBUSER" "$DBNAME" >/dev/null; do
            echo "Waiting for PostgreSQL to be ready for queries."
            sleep 5
        done
    else
        echo "[WARN] No psql installed, cannot use it to verify postgresql is up"
    fi
}


# wait for services to become available
# this prevents race conditions using fig
function wait_for_services {
    if [[ "$WAIT_FOR_DB" ]] ; then
        dockerwait $DBSERVER $DBPORT
        postgreswait
    fi
    if [[ "$WAIT_FOR_CACHE" ]] ; then
        dockerwait $CACHESERVER $CACHEPORT
    fi
    if [[ "$WAIT_FOR_RUNSERVER" ]] ; then
        dockerwait $RUNSERVER $RUNSERVERPORT
    fi
}


function defaults {
    : ${DBSERVER:="db"}
    : ${DBPORT:="5432"}
    : ${RUNSERVER:="web"}
    : ${RUNSERVERPORT:="3000"}
    : ${CACHESERVER="cache"}
    : ${CACHEPORT="11211"}
    : ${DOCKER_ROUTE:=$(/sbin/ip route|awk '/default/ { print $3 }')}

    : ${DBUSER="webapp"}
    : ${DBNAME="${DBUSER}"}
    : ${DBPASS="${DBUSER}"}

    : ${SCRIPT_NAME:="/app"}

    export DBSERVER DBPORT DBUSER DBNAME DBPASS DOCKER_ROUTE
}

 
function _django_check_deploy {
    echo "running check --deploy"
    django-admin.py check --deploy --settings=${DJANGO_SETTINGS_MODULE} 2>&1 | tee /data/     uwsgi-check.log
}
                 
                 
function _django_migrate {
    echo "running migrate"
    django-admin.py migrate --noinput --settings=${DJANGO_SETTINGS_MODULE} 2>&1 | tee /data/  uwsgi-migrate.log
    django-admin.py update_permissions --settings=${DJANGO_SETTINGS_MODULE} 2>&1 | tee /data/ uwsgi-permissions.log
}
                                      
                                      
function _django_collectstatic {
    echo "running collectstatic"
    django-admin.py collectstatic --noinput --settings=${DJANGO_SETTINGS_MODULE} 2>&1 | tee /data/uwsgi-collectstatic.log
}
                                                      

function _django_iprestrict_permissive_fixtures {
    echo "loading iprestrict permissive fixture"
    django-admin.py init iprestrict_permissive
    django-admin.py reloadrules
}


function configure_base_href() {
    BASE="${SCRIPT_NAME}/"
    echo "Setting <base href=\"${BASE}\">"
    sed -e "s|base href=\"/\"|base href=\"${BASE}\"|" /app/gulpdist/index.base.html > /app/gulpdist/index.html
}


function bootstrapdb() {
    django-admin migrate --noinput 2>&1 | tee /data/migrate.log
    django-admin init
    django-admin createinitialrevisions
}


trap exit SIGHUP SIGINT SIGTERM
defaults
env | grep -iv PASS | sort
wait_for_services

# any failures below here are considered fatal
set -e

# uwsgi entrypoint
if [ "$1" = 'uwsgi' ]; then
    echo "[Run] Starting uwsgi"
    configure_base_href

    : ${UWSGI_OPTS="/app/uwsgi/docker.ini"}
    echo "UWSGI_OPTS is ${UWSGI_OPTS}"

    django-admin migrate --noinput 2>&1 | tee /data/uwsgi-migrate.log
    django-admin update_permissions 2>&1 | tee /data/uwsgi-permissions.log

    exec uwsgi --die-on-term --ini ${UWSGI_OPTS}
fi

# gulp entrypoint
if [ "$1" = 'runserver' ]; then
    # the postgres startup issue hurts on local dev, not relevant to prod
    export PRODUCTION=0
    echo "[Run] Starting runserver via gulp"
    cd /app

    [ ! -d ./node_modules ] && [ ! -h ./node_modules ] && ln -s /npm/node_modules
    [ ! -d ./bower_components ] && [ ! -h ./bower_components ] && ln -s /bower/bower_components

    ./node_modules/.bin/gulp bootstrapdb --venv /env

    # prepare for base_href hack in uwsgi entrypoint
    ./node_modules/.bin/gulp html --venv /env
    cp /app/gulpdist/index.html /app/gulpdist/index.base.html

    exec ./node_modules/.bin/gulp serve --online --venv /env
fi

# migration entrypoint
if [ "$1" = 'migrate' ]; then
    export PRODUCTION=0
    echo "[Run] Starting migrate"
    cd /app
    sleep 30
    echo "Drop existing database"
    PGPASSWORD="$TURTLE_DB_1_ENV_POSTGRES_PASSWORD" dropdb -h "$TURTLE_DB_1_PORT_5432_TCP_ADDR" -U "$TURTLE_DB_1_ENV_POSTGRES_USER" -p "$TURTLE_DB_1_PORT_5432_TCP_PORT" turtle
    echo "Create fresh database"
    PGPASSWORD="$TURTLE_DB_1_ENV_POSTGRES_PASSWORD" createdb -h "$TURTLE_DB_1_PORT_5432_TCP_ADDR" -U "$TURTLE_DB_1_ENV_POSTGRES_USER" -p "$TURTLE_DB_1_PORT_5432_TCP_PORT" turtle
    echo "Set up database"
    django-admin migrate --noinput 2>&1 | tee /data/migrate.log
    django-admin init
    echo "Ready for you to go... docker exec in to run migration"
    while true; do
        sleep 30
    done
    exit $?
fi

# bootstrapdb entrypoint
if [ "$1" = 'bootstrapdb' ]; then
    echo "[Run] DB migrating and loading data"
    bootstrapdb
    exit $?
fi

echo "[RUN]: Builtin command not provided [runserver|uwsgi|migrate|bootstrapdb]"
echo "[RUN]: $@"

exec "$@"
