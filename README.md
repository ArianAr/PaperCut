# PaperCut

<p align="center">
  <strong>Interactive terminal pastebin &amp; log analysis canvas</strong><br/>
  Pipe any terminal output to a secure share link — ANSI colors, filters, JSON trees, and line deep-links.
</p>

<p align="center">
  <a href="https://github.com/ArianAr/PaperCut/actions/workflows/ci.yml"><img src="https://github.com/ArianAr/PaperCut/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/ArianAr/PaperCut/releases/latest"><img src="https://img.shields.io/github/v/release/ArianAr/PaperCut?label=release" alt="Release" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0-blue.svg" alt="License" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg" alt="Node.js" /></a>
  <a href="./Dockerfile"><img src="https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white" alt="Docker" /></a>
  <a href="./SECURITY.md"><img src="https://img.shields.io/badge/security-policy-red.svg" alt="Security" /></a>
  <a href="./ROADMAP.md"><img src="https://img.shields.io/badge/roadmap-v1.1+-informational.svg" alt="Roadmap" /></a>
</p>

```bash
yarn build 2>&1 | papercut
# → https://your-host/paste/V1StGXR8_Z
```

---

## Why PaperCut?

Most pastebins dump plain text. PaperCut turns build logs and terminal streams into a **developer workspace**: virtualized scrolling for huge files, log-level filters, fuzzy/regex search, expandable JSON, and GitHub-style `#L12` links — self-hosted on SQLite with zero analytics.

| | |
|---|---|
| **CLI** | Zero npm deps · stdin upload · clipboard share card |
| **Canvas** | ANSI · filters · grep · JSON tree · line links |
| **Self-host** | Docker + SQLite · password pastes · expiry |
| **Privacy** | No analytics · no IP/body logging in app code |

---

## Features

- **Fast CLI** — zero npm dependencies; read stdin, upload, print a share card, copy the URL
- **ANSI-aware viewer** — terminal colors and styles in the browser
- **Virtualized log list** — comfortable browsing of very large logs
- **Log level filters** — DEBUG / INFO / WARN / ERROR / FATAL toggles
- **JSON inspector** — expandable trees for structured log lines
- **Search & grep** — local keyword or `/regex/flags`
- **Line linking** — `#L120` / `#L120-L125` deep links
- **Private pastes** — password-protected links (`--private`)
- **Expiry** — auto-delete after `1h`, `1d`, `7d`, …
- **Privacy-minded** — no analytics; you control the data plane
- **SQLite** — zero-config persistence for simple deploys

---

## Architecture

```
stdin ──► papercut CLI ──POST /api/pastes──► Next.js server
                                              │
                                         SQLite (pastes)
                                              │
                         browser ◄── /paste/[id] (log canvas)
```

| Path | Role |
|------|------|
| [`cli/`](./cli) | Lightweight Node CLI — npm package **`papercut-cli`** (`npx papercut-cli`) |
| [`server/`](./server) | Next.js (App Router) API + log canvas UI |

---

## Quick start (development)

**Requirements:** Node.js ≥ 20 · [pnpm](https://pnpm.io) 9.x

```bash
git clone https://github.com/ArianAr/PaperCut.git
cd PaperCut
pnpm install
cp .env.example server/.env.local
# Set PASTE_AUTH_SECRET to a long random value
pnpm dev
```

```bash
# another terminal
echo -e '\033[31merror\033[0m\n[INFO] all good' | pnpm cli --url http://localhost:3000
```

Open the printed URL in your browser.

---

## CLI usage

```bash
some-command 2>&1 | papercut
some-command 2>&1 | papercut --private
some-command 2>&1 | papercut --expire 1d
some-command 2>&1 | papercut --url https://papercut.example.com
```

| Flag / env | Description |
|------------|-------------|
| `-p`, `--private` | Password-protect (prompt or `PAPERCUT_PASSWORD`) |
| `--expire <time>` | `30m`, `1h`, `1d`, `7d`, … |
| `--url <base>` | Server origin (or `PAPERCUT_URL`) |
| `-V`, `--version` | Print CLI version |
| `-h`, `--help` | Show help |

---

## Docker (self-host)

```bash
export PASTE_AUTH_SECRET="$(openssl rand -hex 32)"
export PAPERCUT_PUBLIC_URL="http://localhost:3000"
docker compose up --build -d
```

| | |
|---|---|
| App | `http://localhost:3000` |
| SQLite | volume `papercut-data` → `/data/papercut.db` |
| Health | `GET /api/health` |

```bash
docker build -t papercut .
docker run --rm -p 3000:3000 \
  -e PASTE_AUTH_SECRET="$PASTE_AUTH_SECRET" \
  -e PAPERCUT_PUBLIC_URL=http://localhost:3000 \
  -v papercut-data:/data \
  papercut
```

For **custom domain + HTTPS**, put nginx/Caddy/Traefik in front — see [docs/deploy](./docs/deploy/README.md).

---

## Environment variables

See [`.env.example`](./.env.example).

| Variable | Description | Default |
|----------|-------------|---------|
| `PAPERCUT_PUBLIC_URL` | Base URL for share links | request origin |
| `DATABASE_PATH` | SQLite file path | `./data/papercut.db` |
| `MAX_PASTE_SIZE` | Max body size (bytes) | `10485760` (10 MiB) |
| `PASTE_AUTH_SECRET` | HMAC secret for unlock cookies | **required in production** |
| `UNLOCK_RATE_LIMIT` | Unlock attempts / window | `10` |
| `UNLOCK_RATE_WINDOW_MS` | Unlock window (ms) | `600000` |
| `CREATE_RATE_LIMIT` | Creates / window | `60` |
| `CREATE_RATE_WINDOW_MS` | Create window (ms) | `600000` |
| `PAPERCUT_METRICS` | Enable `GET /api/metrics` (`1`/`true`/`yes`/`on`) | off |
| `TRUSTED_PROXY_HOPS` | X-Forwarded-For hops to trust (0 = ignore XFF; use `1` behind a proxy) | `0` |
| `COOKIE_SECURE` | Force Secure cookies (`1`/`0`); else from public URL | auto |
| `REDIS_URL` | Shared rate limits across instances (optional) | off (in-memory) |

---

## HTTP API (stable for 1.x)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/pastes` | JSON `{ content, expire?, password? }` **or** `text/plain` body + `X-PaperCut-Expire` / `X-PaperCut-Password` headers (streaming CLI) |
| `GET` | `/api/pastes/:id` | Paste body or `401` + `{ locked: true }` |
| `POST` | `/api/pastes/:id/unlock` | `{ password }` → httpOnly unlock cookie |
| `GET` | `/api/health` | Liveness/readiness (+ expired purge) |
| `GET` | `/api/metrics` | Opt-in counters (`PAPERCUT_METRICS`); **404** when disabled |

UI: `/paste/:id` · deep links `#L12`, `#L12-L20`.

---

## Privacy

- No analytics SDKs in application code
- Paste bodies and client IPs are **not** intentionally logged
- Rate limiting may use `X-Forwarded-For` **in memory only**
- Optional metrics (`PAPERCUT_METRICS`) expose **counters only** (creates, successful unlocks, 429s) — never content or IPs
- Public pastes are **capability URLs** — use `--private` for sensitive data

---

## Documentation

| Doc | |
|-----|---|
| [Changelog](./CHANGELOG.md) | Release history |
| [Roadmap](./ROADMAP.md) | Planned features after 1.0 |
| [Deploy guide](./docs/deploy/README.md) | Reverse proxy, HTTPS, SQLite backup |
| [Contributing](./CONTRIBUTING.md) | Dev setup, CI, labels, release checklist |
| [Security](./SECURITY.md) | Supported versions & vulnerability reporting |
| [Releases](https://github.com/ArianAr/PaperCut/releases) | Git tags (`vX.Y.Z`) |

---

## Status

**Current version: [1.1.0](https://github.com/ArianAr/PaperCut/releases/tag/v1.1.0)** · [1.x API compatibility](./CHANGELOG.md) · roadmap: [ROADMAP.md](./ROADMAP.md)

## Disclaimer

Most of this project was developed with AI assistance. Changes are **peer reviewed, checked, and tested by humans** before they land on `main` (CI, code review, and maintainer oversight). AI does not replace human accountability for what ships.

## License

[GPL-3.0-only](./LICENSE)
