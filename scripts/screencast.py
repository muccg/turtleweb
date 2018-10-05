#!/usr/bin/env python

from __future__ import print_function
import datetime
import os
import subprocess
import sys
import Xlib
import Xlib.display

def set_size(display, window_id, width, height):
    window = display.create_resource_object('window', window_id)
    window.configure(width=width, height=height)
    display.sync()

def find_xid(display, title):
    root = display.screen().root
    window_ids = root.get_full_property(display.intern_atom('_NET_CLIENT_LIST'), Xlib.X.AnyPropertyType).value
    for window_id in window_ids:
        window = display.create_resource_object('window', window_id)
        name = window.get_full_property(display.intern_atom('_NET_WM_NAME'), Xlib.X.AnyPropertyType).value

        if title in name:
            return window_id

    return None

def make_filename(name):
    timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    return "%s-%s.webm" % (name or "screencast", timestamp)

def get_geometry(window):
    geom = window.get_geometry()
    return (geom["x"], geom["y"], geom["width"], geom["depth"])

def start_record(xid, filename):
    # x, y, width, height = get_geometry(xid)
    cmd = [
        "gst-launch-1.0",
        "ximagesrc", "xid=%s" % xid, "use-damage=0", "!",
        "videoconvert", "!",
        "queue", "!",
        "vp8enc", "!",
        "mux.", "webmmux", "name=mux", "!",
        "filesink", "location=%s" % filename
    ]
    p = subprocess.Popen(cmd)
    try:
        p.wait()
    except KeyboardInterrupt:
        p.terminate()

def main():
    display = Xlib.display.Display()

    xid = find_xid(display, "Turtleweb")

    if not xid:
        print("couldn't find Turtleweb")
        return 1

    # set_size(display, xid, 1291, 902)
    set_size(display, xid, 1280, 791)

    filename = make_filename(sys.argv[1] if len(sys.argv) > 1 else None)

    start_record(xid, filename)

    return 0

if __name__ == "__main__":
    sys.exit(main())
