# Security Policy

## Supported versions

Security fixes are provided for the versions below. Always run the latest patch of a supported minor line when possible.

| Version | Supported          | Notes |
| ------- | ------------------ | ----- |
| 1.2.x   | :white_check_mark: | Current stable line (latest: **1.2.0**) — [CHANGELOG](./CHANGELOG.md) |
| 1.1.x   | :x:                | Superseded by 1.2.x |
| 1.0.x   | :x:                | Superseded |
| 0.2.x   | :x:                | Superseded |
| 0.1.x   | :x:                | Superseded |
| &lt; 0.1  | :x:                | Pre-release / untagged |

Policy:

- Fixes land on `main` first, then ship in the next **semver** tag on the supported line.
- Only the latest **stable minor** is supported (currently **1.2.x**).
- Upgrade by pulling the latest release tag or `main` and redeploying (Docker or Node).

When reporting an issue, include the version from `package.json` / the Git tag (e.g. `v1.2.0`).

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately using one of these channels:

1. **GitHub Security Advisories** (preferred):  
   [Report a vulnerability](https://github.com/ArianAr/PaperCut/security/advisories/new) on this repository.
2. If you cannot use advisories, open a **private** contact via the repository owner’s GitHub profile email (if listed) and include `PaperCut security` in the subject.

### What to include

- Description of the issue and impact
- Steps to reproduce (PoC)
- **Affected version / Git tag** (e.g. `v1.0.0`) and commit if known
- Deployment mode (Docker / `pnpm start` / other)
- Any suggested fix (optional)

### What to expect

- **Acknowledgement** within 7 days
- **Status update** within 14 days (accepted, needs more info, or declined)
- Coordinated disclosure: we ask that you give us reasonable time to ship a fix before public disclosure (typically 90 days, shorter if actively exploited)
- Fixed versions are recorded in [CHANGELOG.md](./CHANGELOG.md) under a **Security** section when applicable, and noted in the GitHub Release

We will credit reporters who wish to be named in release notes, unless you prefer to remain anonymous.

## Scope

In scope examples:

- Unauthorized access to password-protected pastes
- Ability to read, modify, or delete other users’ pastes without credentials
- Remote code execution or path traversal on a self-hosted instance
- Secret leakage (auth secrets, password hashes returned to clients)
- Significant denial-of-service that is practical against default configuration
- Bypassing create/unlock rate limits in a way that enables practical abuse on a default single-node deploy

Out of scope examples:

- Issues that require physical access or already-compromised host/admin credentials
- Brute-forcing paste IDs without a practical, scalable attack (IDs are unguessable short IDs, not secrets for private content—use `--private` for sensitive data)
- Missing security headers that do not lead to a concrete exploit on this app
- Vulnerabilities only in third-party dependencies without a path to exploit PaperCut (please report those upstream; we still appreciate a heads-up)
- Social engineering or phishing
- Multi-instance rate-limit bypass when running more than one process without a shared store (documented limitation; single-node Docker is the supported default)

## Security-related product defaults

PaperCut is designed with developer privacy in mind:

- **No analytics** and no intentional IP or body logging of paste content in application code
- **Password-protected pastes** store a password hash only; content is not returned until unlock succeeds
- **Rate limits** use in-memory counters keyed by client hints (e.g. `X-Forwarded-For`); keys are not written to application logs
- **Opt-in metrics** (`PAPERCUT_METRICS`) expose process counters only (paste creates, successful unlocks, rate-limit 429s) via `GET /api/metrics`; disabled by default; never includes paste bodies, IPs, or rate-limit keys
- **Trusted proxy hops** (`TRUSTED_PROXY_HOPS`, default **0** = ignore XFF) so direct deploys cannot bypass rate limits via spoofed `X-Forwarded-For`. Set to `1` behind a single reverse proxy so the real client address is used; keys stay in memory only
- **Self-hosting** is the primary deployment model—you control the data plane

Sensitive logs or credentials should always use **private** (password-protected) pastes and short expiry when possible. A public paste ID is effectively a capability URL: anyone with the link can read a non-private paste.

## Prefer private reporting

If you are unsure whether something is a vulnerability, report it privately. We would rather receive a cautious report than miss a real issue.
