# Publishing `papercut-cli` to npm

This package lives in `cli/` of the monorepo and is published as **`papercut-cli`** on the public npm registry (the name `papercut` is already taken by another package).

After install, users get binaries **`papercut`** and **`papercut-cli`**.

## Preconditions

- [ ] Version in `cli/package.json` matches the release you are shipping
- [ ] `pnpm --filter papercut-cli test` passes
- [ ] `pnpm --filter papercut-cli pack:dry-run` lists only intended files (`bin.js`, `README.md`, `LICENSE`)
- [ ] You are logged in: `npm whoami` (account with publish rights on `papercut-cli`)
- [ ] CHANGELOG / GitHub release notes mention the CLI if user-facing

## Dry-run (local or CI)

```bash
cd cli
npm pack --dry-run
# or from monorepo root:
pnpm --filter papercut-cli pack:dry-run
```

Confirm the tarball includes:

- `bin.js` (entries for `papercut` and `papercut-cli`)
- `README.md`
- `LICENSE` (GPL-3.0-only)
- **No** `test/`, monorepo root, or `node_modules`

CI runs `pnpm --filter papercut-cli pack:dry-run` on every PR (job `cli-pack`).

## Publish

```bash
cd cli
npm publish --access public
```

## After publish

```bash
npx papercut-cli@latest --version
npx papercut-cli@latest --help
```

Tag / GitHub Release should match the published version when this is part of a full PaperCut release.

## Do not

- Publish the monorepo **root** package (`"private": true`)
- Publish `@papercut/server` (private Next app)
- Use the name `papercut` on npm (already taken)
- Commit `.npmrc` with tokens
