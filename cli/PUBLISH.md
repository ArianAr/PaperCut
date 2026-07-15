# Publishing `papercut-cli` to npm

This package lives in `cli/` of the monorepo and is published as **`papercut-cli`** on the public npm registry (the name `papercut` is already taken by another package).

After install, users get binaries **`papercut`** and **`papercut-cli`**.

## Automatic publish (preferred) — Trusted Publisher (OIDC)

On every **GitHub Release** (`published`), workflow [`.github/workflows/publish-npm.yml`](../.github/workflows/publish-npm.yml) publishes `cli/` using [npm trusted publishers](https://docs.npmjs.com/trusted-publishers) (OpenID Connect). **No long-lived npm token** is stored in GitHub.

### One-time setup on npmjs.com

1. Open **[papercut-cli → Settings → Trusted Publisher](https://www.npmjs.com/package/papercut-cli/access)** (or package Settings → Trusted publishing).
2. Choose **GitHub Actions** and set:

   | Field | Value |
   |-------|--------|
   | Organization or user | `ArianAr` |
   | Repository | `PaperCut` |
   | Workflow filename | `publish-npm.yml` (filename only, not full path) |
   | Environment name | *(leave empty unless you add a GitHub Environment)* |
   | Allowed actions | **`npm publish`** (at least) |

3. Save. npm does **not** validate the config until the first publish — double-check spelling.

Optional hardening after OIDC works: package **Settings → Publishing access** → prefer requiring 2FA and restricting classic tokens (trusted publishing still works).

### Release flow

1. Bump versions in lockstep: root, `cli/package.json`, `server/package.json`
2. Update CHANGELOG + SECURITY (see [CONTRIBUTING.md](../CONTRIBUTING.md#releasing))
3. Merge the release PR to `main`
4. Create annotated tag + GitHub Release: `vX.Y.Z` (tag must match `cli` version)
5. Actions runs **Publish npm** → OIDC publish of `papercut-cli@X.Y.Z` (provenance included automatically)

Requirements (enforced by the workflow):

- Node ≥ 22.14 / npm ≥ 11.5.1 (workflow upgrades npm)
- Public GitHub repo (for provenance)
- Workflow file name exactly as configured on npm

## Manual dry-run / local publish

### Preconditions

- [ ] Version in `cli/package.json` matches the release tag
- [ ] `pnpm --filter papercut-cli test` passes
- [ ] `pnpm --filter papercut-cli pack:dry-run` lists only `bin.js`, `README.md`, `LICENSE`
- [ ] CHANGELOG / release notes mention the CLI if user-facing

### Dry-run

```bash
cd cli
npm pack --dry-run
# or:
pnpm --filter papercut-cli pack:dry-run
```

CI also runs pack dry-run on every PR (job `cli-pack`).

### Manual publish (fallback)

```bash
cd cli
npm publish --access public
```

(Interactive 2FA / security key may be required for human sessions.)

### After publish

```bash
npx papercut-cli@latest --version
npm view papercut-cli version
```

## Do not

- Publish the monorepo **root** package (`"private": true`)
- Publish `@papercut/server` (private Next app)
- Use the name `papercut` on npm (already taken)
- Commit `.npmrc` or long-lived publish tokens (prefer trusted publishing)
