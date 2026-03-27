#!/bin/bash
set -e

# Setup writable paths for nginx
mkdir -p "$SNAP_DATA/var/log/nginx"
mkdir -p "$SNAP_DATA/var/lib/nginx"
mkdir -p "$SNAP_DATA/run/nginx"

# Start fastcgi/scgi/uwsgi dummy dirs
mkdir -p /tmp/client_temp /tmp/proxy_temp_path /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp

exec "$SNAP/usr/sbin/nginx" -g "daemon off;"
