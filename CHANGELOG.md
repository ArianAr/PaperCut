# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- [ROADMAP.md](./ROADMAP.md) — post-1.0 feature plan (v1.1–v2.0)
- Roadmap: reverse proxy / domain / HTTPS (nginx, Caddy, Traefik) in v1.1 docs + v1.3 optional compose
- Polished README (badges, architecture sketch, feature summary)
- [docs/deploy](./docs/deploy/README.md) — reverse proxy (nginx/Caddy/Traefik), HTTPS, SQLite backup
- HTTP API route integration tests (create/get/unlock/health/rate-limit)

### Changed

- Lint via **ESLint CLI** (flat config) instead of deprecated `next lint`
- CLI published as **`papercut-cli`** on npm (name `papercut` taken); publish checklist + CI `cli-pack` dry-run

### Planned

See [ROADMAP.md](./ROADMAP.md) for remaining v1.1+ items.

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

### Includes (from 0.x)

- Zero-dependency CLI upload client
- Next.js server with SQLite pastes, password protection, expiry
- Interactive log canvas (ANSI, virtual scroll, filters, search, JSON, line links)
- Docker multi-stage image and compose stack

## [0.2.1] - 2026-07-15

### Added

- [CHANGELOG.md](./CHANGELOG.md) (Keep a Changelog)
- Release checklist in [CONTRIBUTING.md](./CONTRIBUTING.md) (versions, changelog, SECURITY, tag)

### Changed

- Package versions aligned to the release line on every tag (root, CLI, server)
- [SECURITY.md](./SECURITY.md) supported-versions table tracks the current minor line
- README documents current version and links to the changelog

## [0.2.0] - 2026-07-15

### Added

- Interactive log canvas: virtualized list, ANSI color rendering, log-level sidebar filters
- Substring and `/regex/flags` search over plain (ANSI-stripped) lines
- Expandable JSON inspector for structured log lines
- GitHub-style line deep links (`#L12`, `#L12-L20`) with scroll and highlight
- Raw copy and `.log` download from the canvas toolbar
- Multi-stage `Dockerfile` and `docker-compose.yml` with SQLite volume
- Unit coverage for log-line helpers and ANSI HTML escaping (40 server tests)

### Changed

- Paste page uses `LogCanvas` instead of a plain `<pre>` view
- README Docker self-host instructions expanded

### Removed

- Unused `BasicPasteView` component

## [0.1.0] - 2026-07-15

### Added

- Project foundation: README, CONTRIBUTING, SECURITY, monorepo layout (GPL-3.0)
- Next.js App Router server with Tailwind (VS Code Dark theme)
- SQLite persistence via Drizzle + better-sqlite3
- Paste API: create, get, password unlock with HMAC cookies
- Metadata extraction (line counts, log levels, JSON-ish detection)
- Expiry parsing (`30m`, `1h`, `1d`, `7d`, …) and purge-on-read
- Zero-dependency CLI: stdin upload, `--private`, `--expire`, `--url`, share card, clipboard
- Landing page and password gate UI
- Initial unit tests for server libs and CLI

## Links

- [Unreleased]: https://github.com/ArianAr/PaperCut/compare/v1.0.0...HEAD
- [1.0.0]: https://github.com/ArianAr/PaperCut/compare/v0.2.1...v1.0.0
- [0.2.1]: https://github.com/ArianAr/PaperCut/compare/v0.2.0...v0.2.1
- [0.2.0]: https://github.com/ArianAr/PaperCut/compare/v0.1.0...v0.2.0
- [0.1.0]: https://github.com/ArianAr/PaperCut/releases/tag/v0.1.0
