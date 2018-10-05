#!/bin/bash

info () {
    printf "\r  [\033[00;34mINFO\033[0m] %s\n" "("
})

trap exit SIGHUP SIGINT SIGTERM
env | grep -iv PASS | sort

# prepare a tarball of build
if [ "$1" = 'releasetarball' ]; then
    echo "[Run] Preparing a release tarball"
    info "BUILD_VERSION ${BUILD_VERSION}"
    info "PROJECT_SOURCE ${PROJECT_SOURCE}"

    set -e
    cd /app
    rm -rf /app/*
    set -x
    git clone --depth=1 --branch="${GIT_BRANCH}" "${PROJECT_SOURCE}" .
    git rev-parse HEAD > .version
    cat .version

    # Note: Environment vars are used to control the behaviour of pip (use local devpi for instance)
    pip3 install --upgrade -r requirements/runtime-requirements.txt
    pip3 install --upgrade -r requirements/migration.txt
    # as we're doing an in-place install, we need the .egg-info directory in the tarball so
    # entrypoint scripts work in the prod container
    pip3 install -e .
    set +x

    # npm deps in /npm
    mkdir -p /npm
    cp /app/package.json /npm/package.json
    cd /npm && npm install --ignore-scripts

    # bower deps in /bower
    mkdir -p /bower
    cp /app/bower.json /bower/bower.json
    cd /bower && /npm/node_modules/.bin/bower install --allow-root --config.interactive=false

    # install the previously cached bower components into the app
    ln -s /bower/bower_components /app/bower_components
    ln -s /npm/node_modules /app/node_modules

    # Build the frontend into /app/gulpdist
    cd /app
    /app/node_modules/.bin/gulp build --venv /env

    # prepare for base_href hack in uwsgi entrypoint
    cp /app/gulpdist/index.html /app/gulpdist/index.base.html
    chown ccg-user /app/gulpdist/index.html

    # create release tarball
    DEPS="/env /npm /bower /app/uwsgi /app/docker-entrypoint.sh /app/kindred /app/migrate /app/django_kindred.egg-info /app/gulpdist"
    cd /data
    exec tar -cpzf ${PROJECT_NAME}-${BUILD_VERSION}.tar.gz ${DEPS}
fi

echo "[RUN]: Builtin command not provided [releasetarball]"
echo "[RUN]: $@"

exec "$@"
