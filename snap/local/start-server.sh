#!/bin/bash
set -e
exec "$SNAP/usr/bin/node" "$SNAP/bin/server.js"
