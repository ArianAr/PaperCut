# PaperCut Roadmap

Living plan for post-**1.0** work. Status: **1.0.0 shipped** (stable self-hosted pastebin + log canvas).

Priorities may shift based on users and security needs. Items become GitHub issues when work starts; this file is the high-level map.

---

## Principles

1. **Self-host first** — single Docker container + SQLite remains the happy path.
2. **Privacy by default** — no analytics; no paste body / IP logging in app code.
3. **Developer UX** — CLI speed, canvas performance, clear docs.
4. **1.x compatibility** — HTTP API + CLI flags stay stable; breaking changes wait for 2.0.

---

## Now (v1.x maintenance)

| Item | Area | Why |
|------|------|-----|
| Dependabot / security patches (non-major) | deps | Stay secure without Next 16 jump |
| Fix/guard flaky edge cases from real usage | bug | Production hardening |
| Docs polish (screenshots, demo GIF) | docs | Onboarding |
| Track open Dependabot majors deliberately | deps | Next 16, bulk TS upgrades |

---

## Next — v1.1 “Ops & quality”

Focus: production operators and contributors.

| # | Feature | Area | Notes |
|---|---------|------|--------|
| 1.1.1 | **Migrate off `next lint`** to ESLint CLI | ci, server | ✅ Done (ESLint flat config) |
| 1.1.2 | **HTTP API integration tests** | api, test | ✅ Done (route-handler suite) |
| 1.1.3 | **CLI publish dry-run** / npm package readiness | cli | ✅ Done (`cli/PUBLISH.md` + CI `cli-pack`) |
| 1.1.4 | **Structured app metrics (opt-in)** | server | Counters only; no content; disabled by default |
| 1.1.5 | **Graceful DB backup note** + `sqlite3 .backup` recipe | docker, docs | ✅ Done (`docs/deploy`) |
| 1.1.6 | **Dark/light toggle** (still VS Code aesthetic) | ui | ✅ Done (`localStorage` + `data-theme`) |
| 1.1.7 | **Reverse proxy + HTTPS docs** (nginx, Caddy, Traefik) | docker, docs | ✅ Done (`docs/deploy`) |

---

## Later — v1.2 “Canvas power tools”

Focus: log analysis depth.

| # | Feature | Area | Notes |
|---|---------|------|--------|
| 1.2.1 | **Column / wrap mode**, sticky header | ui | Dense log reading |
| 1.2.2 | **Bookmark / pin lines** (local only) | ui | Session or localStorage |
| 1.2.3 | **Multi-file or multi-paste compare** (side-by-side) | ui, api | Optional second paste id |
| 1.2.4 | **Custom highlight rules** (user regex → color) | ui | Per-browser config |
| 1.2.5 | **Timeline scrubber** for timestamped logs | ui | Detect common timestamp formats |
| 1.2.6 | **Download filtered view** (not only raw) | ui | Export what you see |

---

## Later — v1.3 “Scale & multi-node”

Focus: multi-instance self-host without losing privacy defaults.

| # | Feature | Area | Notes |
|---|---------|------|--------|
| 1.3.1 | **Shared rate-limit store** (Redis optional) | server, docker | Fallback: in-memory |
| 1.3.2 | **Object storage for large pastes** (S3/MinIO optional) | server | Keep SQLite for metadata |
| 1.3.3 | **Streaming upload** (chunked stdin) | cli, api | Very large builds |
| 1.3.4 | **Background expire sweeper** (cron process) | server | Complement purge-on-read |
| 1.3.5 | **Read replicas / RO mode** | server | Optional |
| 1.3.6 | **Optional reverse-proxy stack** (compose profiles) | docker | nginx / Caddy / Traefik + ACME for domain + HTTPS; app still plain HTTP behind proxy |
| 1.3.7 | **Proxy-aware runtime** | server | Document/trust hop config for rate limits & secure cookies behind TLS terminators |

### Reverse proxy & HTTPS (intent)

Self-hosters should be able to put PaperCut on a **custom domain with HTTPS** without changing the core app:

1. **v1.1.7 (docs first):** sample configs for **nginx**, **Caddy**, and **Traefik** — terminate TLS, proxy to `papercut:3000`, set `PAPERCUT_PUBLIC_URL=https://paste.example.com`, forward `X-Forwarded-For` / `X-Forwarded-Proto` for rate limits and secure cookies.
2. **v1.3.6–1.3.7 (optional compose):** `docker compose --profile proxy` (or similar) that brings up a reverse proxy with automatic certificates (e.g. Caddy/Traefik ACME), still keeping the Node app on the internal network only.

Out of scope for core: baking a full web server *into* the PaperCut container; TLS belongs at the edge.

---

## Future — v2.0 (breaking allowed)

| # | Feature | Notes |
|---|---------|--------|
| 2.0.1 | **Optional accounts / teams** | Still no required SaaS |
| 2.0.2 | **Client-side E2E encryption** for private pastes | Password never hits server |
| 2.0.3 | **Live append / tail** to existing paste | Streaming sessions |
| 2.0.4 | **Plugin hooks** (webhooks on create) | Automation |
| 2.0.5 | **Next.js 16+ / React upgrades** as baseline | After lint migration |

---

## Explicit non-goals (for now)

- Built-in analytics or third-party trackers
- Public multi-tenant cloud as the primary product
- Guaranteed horizontal scale without optional external stores
- Replacing Docker/SQLite as the default deploy path

---

## How to contribute to the roadmap

1. Open a **feature request** issue (template applies `enhancement` + `needs-triage`).
2. Label with **area:*** and optional **priority:***.
3. Link related roadmap row in the issue body (`ROADMAP.md` § …).
4. Prefer small PRs that match one roadmap item.

Security work always follows [SECURITY.md](./SECURITY.md), not public issues.
