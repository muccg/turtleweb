Encrypted Laptop Notes
======================

Dell XPS 13 Laptop
S/N: 6DW1L12
Murdoch Asset Sticker barcode 229776

Booting
-------

You need to enter the LUKS passphrase twice to get the laptop to boot.

All passphrases -- LUKS, ccg-user, root -- are the same one.

The system is configured to auto-login to GNOME.


Systemd Service
---------------

The laptop is configured to start a dev server on boot. The listen
port will be 3000.

This is the service file which starts the dev server.

    # /etc/systemd/system/turtleweb.service
    [Unit]
    Description=Turtleweb Dev Server
    Requires=postgresql.service
    After=postgresql.service
    Type=simple

    [Service]
    ExecStart=/home/ccg-user/turtle/develop.sh start
    Restart=always
    RestartSec=10

    User=ccg-user

    [Install]
    WantedBy=graphical.target

    
Source code
-----------

The git repo is checked out in ``~/turtle``.

The data tarballs are also in this directory.
