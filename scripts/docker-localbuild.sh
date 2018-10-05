#!/bin/bash

############################################################################
# Docker build

# This builds a certain version (or HEAD) of the current git repo.

# It clones into a temp dir so the source tree is pristine and you can
# mess with the current repo whilst building.

docker_build() {
    if [ -z $1 ]; then
        REV=""
    else
        REV="turtle-$1"
    fi

    CHECKOUT=$(cd `dirname $0`; pwd)

    CHECKOUT_TEMP=$(mktemp -d)
    trap "rm -rf $CHECKOUT_TEMP" EXIT

    cd $CHECKOUT_TEMP
    git clone $CHECKOUT
    cd *
    git checkout $REV

    TAG=$(git describe | sed 's/^turtle-//')

    docker build -f Dockerfile-release -t "muccg/turtle:$TAG" .
}

