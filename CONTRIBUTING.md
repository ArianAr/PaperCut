# Contributing to PaperCut

Thanks for helping improve PaperCut. This guide covers how to develop, test, and submit changes.

## Code of collaboration

- Be respectful and constructive in issues and pull requests.
- Prefer small, focused PRs over large multi-purpose changes.
- Match existing style, naming, and project layout.
- Do not commit secrets, real production logs, or personal data.

## Project layout

```
papercut/
├── cli/          # Zero-dependency Node CLI (stdin → upload)
├── server/       # Next.js App Router app (API + log canvas)
├── package.json  # pnpm workspace root
└── ...
```

## Prerequisites

- **Node.js** ≥ 20 (see `.nvmrc`)
- **pnpm** 9.x (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Git

## Getting started

```bash
git clone https://github.com/ArianAr/PaperCut.git
cd PaperCut
pnpm install
cp .env.example server/.env.local   # or root .env as documented in README
pnpm dev
```

In another terminal:

```bash
echo "hello from papercut" | pnpm cli --url http://localhost:3000
```

## Development workflow

1. **Open an issue** (optional for tiny fixes) describing the bug or feature.
2. **Branch from `main`:**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/short-description
   ```
   Branch prefixes we use: `feat/`, `fix/`, `docs/`, `chore/`, `test/`.
3. **Implement** with tests for behavior changes.
4. **Run checks locally** (same as CI):
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   pnpm build
   ```
5. **Commit** with clear messages (see below).
6. **Push and open a PR** against `main`.

### Continuous integration

Pull requests and pushes to `main` run [.github/workflows/ci.yml](./.github/workflows/ci.yml):

| Job | What |
|-----|------|
| `test` | `pnpm test` (server Vitest + CLI `node:test`) |
| `typecheck` | `pnpm typecheck` |
| `lint` | `pnpm lint` |
| `build` | `pnpm build` |
| `cli-pack` | `pnpm --filter papercut-cli pack:dry-run` (npm publish surface) |
| `ci` | Aggregate gate — **required** to merge into `main` |

Faulty PRs cannot merge while the required `ci` check is red (branch ruleset on `main`).

### Labels

Use labels so issues and PRs are easy to filter. Templates apply **type** labels automatically; maintainers add **area**, **priority**, and **status**.

| Group | Examples | Use |
|-------|----------|-----|
| **Type** | `bug`, `enhancement`, `documentation`, `security`, `test`, `refactor`, `performance`, `breaking-change`, `question` | What kind of work |
| **Area** | `area:cli`, `area:server`, `area:ui`, `area:api`, `area:docker`, `area:docs`, `area:ci` | Where in the monorepo |
| **Status** | `needs-triage`, `needs-info`, `blocked`, `ready`, `in-progress` | Workflow state |
| **Priority** | `priority:low` … `priority:critical` | Urgency |
| **Deps / CI** | `dependencies`, `javascript`, `github-actions`, `ci`, `release` | Dependabot and tooling PRs |
| **Community** | `good first issue`, `help wanted`, `duplicate`, `invalid`, `wontfix` | Contribution routing |

New bug/feature issues get `needs-triage` until a maintainer reviews them.

### Commit messages

Use concise, imperative subjects:

```
feat(cli): copy share URL to clipboard
fix(server): reject expired pastes on read
docs: clarify MAX_PASTE_SIZE env var
test(api): cover password unlock cookie
```

### Pull requests

- Describe **what** changed and **why**.
- Link related issues (`Fixes #123`).
- Note any migration or env var changes.
- Keep the PR reviewable: one logical feature or fix when practical.
- Ensure CI (when configured) and local tests pass.

Maintainers may request changes. Please re-request review after addressing feedback.

## Testing expectations

- **Unit tests** for pure logic (`parse-expire`, metadata extraction, password helpers, etc.).
- **API / integration tests** for create, get, unlock, expiry, and size limits.
- **CLI tests** for argument parsing and upload behavior (mock `fetch` where needed).
- Prefer deterministic tests; avoid depending on real wall-clock time without injection.

When fixing a bug, add a regression test when feasible.

## Coding standards

- TypeScript for the server; keep the CLI **zero npm dependencies** (Node built-ins only).
- No analytics libraries; do not log paste bodies or client IPs in application code.
- Validate and bound external input (paste size, expire strings, passwords).
- Prefer small modules under `server/lib/` over large catch-all files.
- Accessibility: interactive controls should be keyboard-usable where reasonable.

## Security

Do **not** report security vulnerabilities in public issues. Follow [SECURITY.md](./SECURITY.md).

## Releasing

Every **semver release** (Git tag + GitHub Release) must update the repo in the same change set. Do not tag without these steps.

### Checklist

1. **Changelog** — Move items from `[Unreleased]` in [CHANGELOG.md](./CHANGELOG.md) into a new section `## [X.Y.Z] - YYYY-MM-DD` (Keep a Changelog categories: Added / Changed / Fixed / Security / Removed). Update compare links at the bottom.
2. **Versions** — Bump `version` in lockstep:
   - root [`package.json`](./package.json)
   - [`cli/package.json`](./cli/package.json)
   - [`server/package.json`](./server/package.json)
3. **Security policy** — Update the supported-versions table in [SECURITY.md](./SECURITY.md) (current line supported; older minors unsupported unless explicitly maintained).
4. **Tests** — `pnpm test` (and any package-specific suites) green on the release commit.
5. **Tag & release** — Create an annotated tag `vX.Y.Z` on `main` and a GitHub Release whose body matches the CHANGELOG section (or links to it).
6. **PR hygiene** — Prefer a dedicated `chore/release-X.Y.Z` PR (or include the version/changelog/security updates in the final feature PR before tagging).

### Versioning hints

- **Patch** (`0.2.1`): bugfixes, security patches, docs that ship with a tag
- **Minor** (`0.3.0`): new features, backward-compatible
- **Major** (`1.0.0`): stable API / breaking changes

## License

By contributing, you agree that your contributions are licensed under the same license as the project (GPL-3.0-only; see [LICENSE](./LICENSE)).

