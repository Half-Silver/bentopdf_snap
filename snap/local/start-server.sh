#!/bin/bash
set -e

CERT_DIR="$SNAP_DATA/certs"
CERT_FILE="$CERT_DIR/server.crt"
KEY_FILE="$CERT_DIR/server.key"

# Generate self-signed certificate on first run
if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
  echo "Generating self-signed TLS certificate..."
  mkdir -p "$CERT_DIR"
  openssl req -x509 -newkey rsa:2048 -nodes \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -days 3650 \
    -subj "/CN=bentopdf/O=BentoPDF/C=US" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:0.0.0.0"
  echo "Certificate generated at $CERT_DIR"
fi

export TLS_CERT="$CERT_FILE"
export TLS_KEY="$KEY_FILE"

exec "$SNAP/usr/bin/node" "$SNAP/bin/server.js"
