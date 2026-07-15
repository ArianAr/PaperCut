# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub Actions CI (`test`, `typecheck`, `lint`, `build`, aggregate `ci`) on PRs and `main`
- Branch ruleset requiring the `ci` check before merging to `main`
- In-memory rate limits for paste create and password unlock (429 + `Retry-After`)
- Security headers (CSP, frame deny, nosniff, referrer policy) via Next config
- `GET /api/health` readiness probe; Docker healthcheck uses it
- Batch purge of expired pastes (`purgeExpiredPastes`)
- `robots.txt` disallows crawlers on `/paste/` and `/api/`
- Repo Dependabot config and issue/PR templates (CodeQL via GitHub default setup)
- CLI `--version` / `-V`

### Security

- Bump `drizzle-orm` to ≥0.45.2 (SQL identifier injection advisory)
- Bump `postcss` to ≥8.5.10 (stringify XSS advisory)

### Planned

- Multi-instance rate limiting (Redis) for horizontally scaled deploys

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

- [Unreleased]: https://github.com/ArianAr/PaperCut/compare/v0.2.1...HEAD
- [0.2.1]: https://github.com/ArianAr/PaperCut/compare/v0.2.0...v0.2.1
- [0.2.0]: https://github.com/ArianAr/PaperCut/compare/v0.1.0...v0.2.0
- [0.1.0]: https://github.com/ArianAr/PaperCut/releases/tag/v0.1.0
