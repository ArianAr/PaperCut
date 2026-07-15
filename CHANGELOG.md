# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

See [ROADMAP.md](./ROADMAP.md) (dependency currency, remaining scale items, v2.0).

## [1.2.0] - 2026-07-16

**Canvas power tools** + security hardening + scale/ops features that landed after 1.1.0.

### Added

#### Canvas (v1.2)

- Log canvas **wrap / no-wrap** toggle (dense horizontal scroll), sticky line-number gutter, preference in `localStorage`
- Log canvas **line pins / bookmarks** (per-paste `localStorage`, gutter star + sidebar jump list)
- Log canvas **download filtered / visible lines** (`paste-<id>-filtered.log`)
- Log canvas **custom highlight rules** (regex → color, per-browser `localStorage`)
- Log canvas **timeline scrubber** for timestamped logs (ISO / date-time / syslog / epoch)
- Log canvas **multi-paste compare** (side-by-side via `?compare=<id>` or sidebar)

#### Scale & ops

- GitHub Actions **Publish npm** workflow — auto-publish `papercut-cli` on GitHub Release via [npm trusted publishers](https://docs.npmjs.com/trusted-publishers) (OIDC; no long-lived token)
- Light/dark theme toggle (VS Code–style palettes, `localStorage` persistence)
- Roadmap: **dependency currency** policy (prefer latest packages + majors plan)
- Opt-in process metrics (`PAPERCUT_METRICS=1`) — `GET /api/metrics` counters only (`pastes_created`, `unlocks_ok`, `rate_limited`); disabled by default; no content/IP logging
- Proxy-aware runtime: `TRUSTED_PROXY_HOPS` for rate-limit client keys; Secure cookies from `PAPERCUT_PUBLIC_URL` / `COOKIE_SECURE`
- Docker Compose **profiles**: `proxy` (Caddy + ACME), `sweeper` (periodic `/api/health` purge)
- Optional **Redis** rate limiting via `REDIS_URL` (multi-node; memory fallback)
- CLI **streaming upload** (`text/plain` body + headers); API accepts raw body with size limit

### Fixed

- Theme FOUC boot script is a static string (no `JSON.stringify` interpolation) to clear CodeQL `js/bad-code-sanitization`
- CI workflow sets explicit `permissions: contents: read` (CodeQL `actions/missing-workflow-permissions`)
- `stripAnsi` uses a linear scan instead of nested quantifier regexes (CodeQL `js/polynomial-redos`)

### Security

- Production rejects empty/known-placeholder/`<16` char `PASTE_AUTH_SECRET`; Compose no longer ships a working default secret
- Default `TRUSTED_PROXY_HOPS=0` (ignore spoofable XFF on direct deploys); in-memory rate limiters prune/evict keys; set hops `1` behind a reverse proxy
- Bound JSON create and unlock request bodies; max password length 1024 (reject before scrypt)

### Package versions

`1.2.0` — root, `papercut-cli`, `@papercut/server`

## [1.1.0] - 2026-07-15

Ops & quality release: publishable CLI, stronger CI, deploy docs, ESLint CLI.

### Added

- [ROADMAP.md](./ROADMAP.md) — post-1.0 feature plan (v1.1–v2.0), including reverse proxy / HTTPS path
- Polished README (badges, architecture sketch, feature summary)
- [docs/deploy](./docs/deploy/README.md) — reverse proxy (nginx/Caddy/Traefik), HTTPS, SQLite backup
- HTTP API route integration tests (create/get/unlock/health/rate-limit)
- CLI npm package **`papercut-cli`** (bins `papercut` + `papercut-cli`), publish checklist, CI `cli-pack` dry-run
- Repository labels, issue/PR templates, Dependabot config (earlier in the 1.1 cycle)

### Changed

- Lint via **ESLint CLI** (flat config) instead of deprecated `next lint`
- Aggregate CI gate requires `cli-pack` in addition to test/typecheck/lint/build

### Package versions

`1.1.0` — root, `papercut-cli`, `@papercut/server`

## [1.0.0] - 2026-07-15

First stable release. HTTP API paths and CLI flags in this version are covered by the 1.x compatibility intent documented in the README.

### Added

- GitHub Actions CI (`test`, `typecheck`, `lint`, `build`, aggregate `ci`) on PRs and `main`
- Branch protection / ruleset requiring the `ci` check before merging to `main`
- In-memory rate limits for paste create and password unlock (429 + `Retry-After`)
- Security headers (CSP, frame deny, nosniff, referrer policy) via Next config
- `GET /api/health` readiness probe; Docker healthcheck uses it
- Batch purge of expired pastes (`purgeExpiredPastes`)
- `robots.txt` disallows crawlers on `/paste/` and `/api/`
- Repo Dependabot config and issue/PR templates (CodeQL via GitHub default setup)
- CLI `--version` / `-V`
- Documented stable HTTP API table in README

### Security

- Bump `drizzle-orm` to ≥0.45.2 (SQL identifier injection advisory)
- Bump `postcss` to ≥8.5.10 (stringify XSS advisory)
