#!/usr/bin/env bash

set -e

VIRTUALENV=$1

if [ -z $VIRTUALENV ]; then
    echo "Creates a virtualenv if it doesn't already exist"
    echo
    echo "Usage: $0 VIRTUALENV_PATH"
    exit 1
fi

find_pyvenv() {
    for PYVENV in pyvenv-3.4 virtualenv-3.4 pyvenv virtualenv false; do
        if which $PYVENV >/dev/null; then
            break;
        fi
    done

    if [ false = ${PYVENV} ]; then
        echo "No virtualenv command found"
        exit 2
    fi
}

virtualenv_base() {
    ${PYVENV} --system-site-packages ${VIRTUALENV}
    test -x ${VIRTUALENV}/bin/pip || \
        ( echo "# Installing pip for python3" && \
          curl https://raw.githubusercontent.com/pypa/pip/master/contrib/get-pip.py | ${VIRTUALENV}/bin/python )
}

cachedir_tag() {
    # Automatically skip venvs in backup programs
    cat > ${VIRTUALENV}/CACHEDIR.TAG <<EOF
Signature: 8a477f597d28d172789f06886806bc55
# This file is a cache directory tag created by ensure_virtualenv.sh.
# For information about cache directory tags, see:
#     http://www.brynosaurus.com/cachedir/
EOF
}

ensure_virtualenv() {
    if ${VIRTUALENV}/bin/python -c "import kindred" > /dev/null 2>&1; then
        echo "Virtualenv ${VIRTUALENV} is ok"
    else
        echo "Installing virtualenv to ${VIRTUALENV}"
        find_pyvenv
        virtualenv_base
        cachedir_tag
        ${VIRTUALENV}/bin/pip install --upgrade -r requirements/local.txt -r requirements/migration.txt
    fi
    ${VIRTUALENV}/bin/pip install --upgrade -e .
}

ensure_virtualenv
