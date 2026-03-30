# BentoPDF Snap — Installation & Usage Guide

## Prerequisites

- Ubuntu 24.04 (or any Linux with snapd)
- The `bentopdf_2.7.0_amd64.snap` file

---

## Installation

```bash
# Install the snap (--dangerous flag for local/unsigned snaps)
sudo snap install --dangerous bentopdf_2.7.0_amd64.snap
```

The service starts automatically after installation.

---

## Accessing BentoPDF

Open your browser and navigate to:

```
https://<device-ip>:9080
```

> **First-time setup:** The browser will show a certificate warning (self-signed TLS cert).
> Click **Advanced → Proceed** to accept it. You only need to do this once per browser.

**Examples:**
- Local access: `https://localhost:9080`
- LAN access: `https://192.168.1.10:9080`

---

## Managing the Service

```bash
# Check service status
sudo snap services bentopdf

# Start the service
sudo snap start bentopdf

# Stop the service
sudo snap stop bentopdf

# Restart the service
sudo snap restart bentopdf

# View logs
snap logs bentopdf

# View more log lines
snap logs bentopdf -n 50
```

---

## Updating

```bash
# Remove old version
sudo snap remove bentopdf

# Install new version
sudo snap install --dangerous bentopdf_<new_version>_amd64.snap
```

---

## Troubleshooting

### Service won't start
```bash
# Check logs for errors
sudo journalctl -xeu snap.bentopdf.bentopdf.service --no-pager -n 50
```

### WASM tools not working (Word-to-PDF, etc.)
- Make sure you're using `https://` (not `http://`)
- Accept the self-signed certificate warning
- These tools require SharedArrayBuffer which needs HTTPS

### Downloads not working
- Ensure you're using `https://` — blob URL downloads require a secure context
- Check browser downloads (Cmd+J / Ctrl+J) for stuck items

### Port conflict
The default port is `9080`. If it conflicts with another service, it can be changed by setting the `PORT` environment variable in the snap configuration.

### Certificate issues
The self-signed TLS certificate is auto-generated on first run and stored at:
```
/var/snap/bentopdf/current/certs/
```

To regenerate it:
```bash
sudo rm -rf /var/snap/bentopdf/current/certs/
sudo snap restart bentopdf
```

---

## Building from Source

```bash
# Clone the repository
git clone https://github.com/Half-Silver/bentopdf_snap.git
cd bentopdf_snap

# Build the snap
sudo snapcraft --destructive-mode --verbose

# The .snap file will be created in the project root
ls *.snap
```

---

## Architecture

| Component | Description |
|---|---|
| **Node.js server** | Serves static files over HTTPS with COOP/COEP headers |
| **Self-signed TLS** | Generated on first run via openssl |
| **COOP/COEP headers** | Enable SharedArrayBuffer for WASM tools |
| **Port** | `9080` (configurable via `PORT` env var) |
| **Web root** | `$SNAP/var/www/bentopdf/` |
