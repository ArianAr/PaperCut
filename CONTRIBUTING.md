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
4. **Run checks locally:**
   ```bash
   pnpm test
   pnpm lint
   pnpm typecheck
   ```
5. **Commit** with clear messages (see below).
6. **Push and open a PR** against `main`.

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

## License

By contributing, you agree that your contributions are licensed under the same license as the project (GPL-3.0-only; see [LICENSE](./LICENSE)).
