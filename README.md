# PaperCut

**Interactive terminal pastebin and log analysis canvas.**

Pipe any terminal output or log file to a self-hosted PaperCut instance and get a secure, shareable link. The result is not a static text dump—it is a developer-focused log canvas with ANSI colors, virtualized scrolling, log-level filters, JSON inspection, grep, and GitHub-style line links.

```bash
yarn build | papercut
# → https://your-host/paste/V1StGXR8_Z
```

## Features

- **Fast CLI** — zero npm dependencies; read stdin, upload, print a share card, copy the URL
- **ANSI-aware viewer** — terminal colors and styles rendered in the browser
- **Virtualized log list** — comfortable browsing of very large logs
- **Log level filters** — DEBUG / INFO / WARN / ERROR / FATAL toggles
- **JSON inspector** — expandable trees for structured log lines
- **Search & grep** — local keyword or regex filtering
- **Line linking** — `#L120` / `#L120-L125` deep links
- **Private pastes** — password-protected links (`--private`)
- **Expiry** — auto-delete after `1h`, `1d`, `7d`, etc.
- **Privacy-minded** — no analytics; self-host your data
- **SQLite** — zero-config persistence for simple deploys

## Architecture

| Path | Role |
|------|------|
| [`cli/`](./cli) | Lightweight Node CLI (`npx` / global install) |
| [`server/`](./server) | Next.js (App Router) API + log canvas UI |

Storage: **SQLite** via Drizzle ORM. Deploy with Node or Docker.

## Quick start (development)

**Requirements:** Node.js ≥ 20, [pnpm](https://pnpm.io) 9.x

```bash
git clone https://github.com/ArianAr/PaperCut.git
cd PaperCut
pnpm install
cp .env.example server/.env.local
# Edit PASTE_AUTH_SECRET to a long random value
pnpm dev
```

Upload a paste:

```bash
echo -e '\033[31merror\033[0m\n[INFO] all good' | pnpm cli --url http://localhost:3000
```

Open the printed URL in your browser.

## CLI usage

```bash
# Basic
some-command 2>&1 | papercut

# Password-protected
some-command 2>&1 | papercut --private

# Auto-expire
some-command 2>&1 | papercut --expire 1d

# Custom server
some-command 2>&1 | papercut --url https://papercut.example.com
```

| Flag | Description |
|------|-------------|
| `-p`, `--private` | Password-protect the paste (prompt or `PAPERCUT_PASSWORD`) |
| `--expire <time>` | Expiry: `30m`, `1h`, `1d`, `7d`, … |
| `--url <base>` | Server base URL (or env `PAPERCUT_URL`) |
| `-h`, `--help` | Show help |

## Docker (self-host)

```bash
export PASTE_AUTH_SECRET="$(openssl rand -hex 32)"
export PAPERCUT_PUBLIC_URL="http://localhost:3000"
docker compose up --build -d
```

- App: `http://localhost:3000`
- SQLite: Docker volume `papercut-data` (`DATABASE_PATH=/data/papercut.db`)

Or build the image directly:

```bash
docker build -t papercut .
docker run --rm -p 3000:3000 \
  -e PASTE_AUTH_SECRET="$PASTE_AUTH_SECRET" \
  -e PAPERCUT_PUBLIC_URL=http://localhost:3000 \
  -v papercut-data:/data \
  papercut
```

## Environment variables

See [`.env.example`](./.env.example).

| Variable | Description | Default |
|----------|-------------|---------|
| `PAPERCUT_PUBLIC_URL` | Base URL for share links | request origin / `http://localhost:3000` |
| `DATABASE_PATH` | SQLite file path | `./data/papercut.db` |
| `MAX_PASTE_SIZE` | Max body size (bytes) | `10485760` (10 MiB) |
| `PASTE_AUTH_SECRET` | HMAC secret for unlock cookies | required in production |

## Privacy

- PaperCut application code does **not** include analytics SDKs.
- Paste bodies and client IPs are **not** intentionally logged by the app.
- Public pastes are **capability URLs** (anyone with the link can read them). Use `--private` for sensitive content.
- You control the host when self-hosting.

## Documentation

- [Contributing](./CONTRIBUTING.md) — setup, PR process, testing
- [Security policy](./SECURITY.md) — vulnerability reporting
- [License](./LICENSE) — GPL-3.0-only

## Status

PaperCut is under active development. APIs and UI may change before 1.0.

## License

[GPL-3.0-only](./LICENSE)
