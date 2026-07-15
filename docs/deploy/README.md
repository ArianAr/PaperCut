# Deploying PaperCut

Self-host PaperCut with Docker (or Node), optionally behind a reverse proxy for a **custom domain and HTTPS**.

## Contents

- [Quick Docker](#quick-docker)
- [SQLite backup](#sqlite-backup)
- [Reverse proxy + HTTPS](#reverse-proxy--https)
  - [nginx](#nginx)
  - [Caddy](#caddy)
  - [Traefik](#traefik)
- [Environment checklist](#environment-checklist)

---

## Quick Docker

```bash
export PASTE_AUTH_SECRET="$(openssl rand -hex 32)"
export PAPERCUT_PUBLIC_URL="https://paste.example.com"   # public URL users open
docker compose up --build -d
```

- App listens on **port 3000** (HTTP) inside the container / on the host.
- Data: Docker volume `papercut-data` → `/data/papercut.db`.
- Health: `GET /api/health`.

PaperCut does **not** terminate TLS itself. Put a reverse proxy in front for HTTPS.

---

## SQLite backup

Database path defaults to `/data/papercut.db` in Docker (`DATABASE_PATH`).

### Online backup with `sqlite3` (preferred)

With the container running and `sqlite3` available on the host (or in a one-off container that mounts the same volume):

```bash
# Example: one-off container with the volume mounted
docker run --rm \
  -v papercut_papercut-data:/data \
  -v "$(pwd)/backups:/backups" \
  keinos/sqlite3 \
  sqlite3 /data/papercut.db ".backup '/backups/papercut-$(date +%Y%m%d-%H%M%S).db'"
```

If your compose project name differs, list volumes with `docker volume ls` and use the full volume name.

### Volume snapshot (stopped or consistent)

```bash
docker compose stop papercut
docker run --rm \
  -v papercut_papercut-data:/data:ro \
  -v "$(pwd)/backups:/backups" \
  alpine tar czf /backups/papercut-data.tgz -C /data .
docker compose start papercut
```

### Restore

```bash
docker compose stop papercut
# replace file in volume or extract tarball into /data
docker compose start papercut
```

Schedule backups (cron / systemd timer) and store copies off-box. WAL mode is enabled; prefer `.backup` while the app is running rather than copying the raw file under load.

---

## Reverse proxy + HTTPS

### Goals

1. Users hit `https://paste.example.com`.
2. Proxy terminates TLS and forwards to PaperCut on `http://127.0.0.1:3000` (or Docker service `papercut:3000`).
3. Set **`PAPERCUT_PUBLIC_URL=https://paste.example.com`** so share links use HTTPS.
4. Forward **`X-Forwarded-For`** and **`X-Forwarded-Proto`** so rate limiting and secure cookies behave correctly.

DNS: point `paste.example.com` at your server (A/AAAA).

### nginx

```nginx
# /etc/nginx/sites-available/papercut
upstream papercut {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name paste.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name paste.example.com;

    # ssl_certificate     /etc/letsencrypt/live/paste.example.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/paste.example.com/privkey.pem;

    client_max_body_size 12m;

    location / {
        proxy_pass http://papercut;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_read_timeout 60s;
    }
}
```

Obtain certs with Certbot (`certbot --nginx -d paste.example.com`) or your usual ACME flow.

### Caddy

Automatic HTTPS with ACME when DNS points at the host:

```caddy
# Caddyfile
paste.example.com {
    reverse_proxy 127.0.0.1:3000
    encode gzip
    request_body {
        max_size 12MB
    }
}
```

Docker Compose sketch (proxy only; PaperCut on the same network):

```yaml
# illustrative fragment — full profile planned for roadmap v1.3.6
services:
  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    depends_on:
      - papercut
```

### Traefik

Example labels if PaperCut is a Compose service named `papercut`:

```yaml
services:
  papercut:
    # ... existing image/env/volumes ...
    labels:
      - traefik.enable=true
      - traefik.http.routers.papercut.rule=Host(`paste.example.com`)
      - traefik.http.routers.papercut.entrypoints=websecure
      - traefik.http.routers.papercut.tls.certresolver=le
      - traefik.http.services.papercut.loadbalancer.server.port=3000
    # do not publish 3000 publicly; only Traefik reaches it on the Docker network
```

Configure Traefik entrypoints `web`/`websecure` and a Let's Encrypt certificate resolver (`le`) in the Traefik static config.

---

## Environment checklist

| Variable | Behind reverse proxy |
|----------|----------------------|
| `PAPERCUT_PUBLIC_URL` | `https://paste.example.com` (no trailing slash) |
| `PASTE_AUTH_SECRET` | Long random secret (required in production) |
| `DATABASE_PATH` | e.g. `/data/papercut.db` |
| `PAPERCUT_METRICS` | Optional: `1` to enable `GET /api/metrics` (counters only; off by default) |
| `TRUSTED_PROXY_HOPS` | Usually `1` behind a single reverse proxy (default). Use `0` only if you do not forward XFF. |
| `COOKIE_SECURE` | Optional override; with `PAPERCUT_PUBLIC_URL=https://…` unlock cookies are Secure automatically |
| Proxy headers | `X-Forwarded-For`, `X-Forwarded-Proto` |

Firewall: expose **80/443** publicly; keep **3000** localhost-only or Docker-internal when using a proxy.

---

## Related roadmap

- Full compose proxy profiles: [ROADMAP § v1.3.6](../../ROADMAP.md)
- Proxy-aware runtime hardening: [ROADMAP § v1.3.7](../../ROADMAP.md)
