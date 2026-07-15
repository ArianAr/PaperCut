# Agent / maintainer workflow (PaperCut)

Durable process for automated and human contributors shipping to this repo.

## One PR per issue

- Prefer **one GitHub issue → one feature branch → one PR**.
- Link with `Closes #N` in the PR body.
- Keep PRs small and reviewable; do not bundle unrelated work.

## Test every change (before push and before merge)

Behavior changes need tests. Always run the same gates as CI locally:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
# when CLI packaging surface changes:
pnpm --filter papercut-cli pack:dry-run
```

Do **not** merge on a red required `ci` check. Fix failures on the branch first.

## Review every PR before merge

1. Open the PR against `main`.
2. Wait for CI (`ci` aggregate gate) to go green.
3. Run a **code review** on the PR (reviewer skill / `/review --pr <n>`), post findings as a **PENDING** GitHub review when issues exist, or record a clean review summary when none do.
4. Address any **bug**-severity findings before merge; treat suggestions proportionally.
5. Only then squash-merge (and delete the branch).

Reviews are not optional polish — they catch regressions that unit tests miss (UI wiring, security, privacy defaults).

## Privacy and security defaults

- No paste body / IP logging in app code.
- Opt-in metrics only (`PAPERCUT_METRICS`); counters never include content or IPs.
- Pins/bookmarks/theme prefs stay in the browser (`localStorage`), not on the server.

## Dependency and release notes

- Prefer latest compatible dependencies; majors in deliberate PRs (see [ROADMAP.md](./ROADMAP.md)).
- User-facing or security fixes: update [CHANGELOG.md](./CHANGELOG.md) under `[Unreleased]`.
