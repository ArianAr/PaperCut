# Security Policy

## Supported versions

| Version | Supported          |
| ------- | ------------------ |
| 0.x     | :white_check_mark: |

Until a stable 1.0 release, security fixes are applied on the latest `main` branch only.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report privately using one of these channels:

1. **GitHub Security Advisories** (preferred):  
   [Report a vulnerability](https://github.com/ArianAr/PaperCut/security/advisories/new) on this repository.
2. If you cannot use advisories, open a **private** contact via the repository owner’s GitHub profile email (if listed) and include `PaperCut security` in the subject.

### What to include

- Description of the issue and impact
- Steps to reproduce (PoC)
- Affected version / commit if known
- Any suggested fix (optional)

### What to expect

- **Acknowledgement** within 7 days
- **Status update** within 14 days (accepted, needs more info, or declined)
- Coordinated disclosure: we ask that you give us reasonable time to ship a fix before public disclosure (typically 90 days, shorter if actively exploited)

We will credit reporters who wish to be named in release notes, unless you prefer to remain anonymous.

## Scope

In scope examples:

- Unauthorized access to password-protected pastes
- Ability to read, modify, or delete other users’ pastes without credentials
- Remote code execution or path traversal on a self-hosted instance
- Secret leakage (auth secrets, password hashes returned to clients)
- Significant denial-of-service that is practical against default configuration

Out of scope examples:

- Issues that require physical access or already-compromised host/admin credentials
- Brute-forcing paste IDs without a practical, scalable attack (IDs are unguessable short IDs, not secrets for private content—use `--private` for sensitive data)
- Missing security headers that do not lead to a concrete exploit on this app
- Vulnerabilities only in third-party dependencies without a path to exploit PaperCut (please report those upstream; we still appreciate a heads-up)
- Social engineering or phishing

## Security-related product defaults

PaperCut is designed with developer privacy in mind:

- **No analytics** and no intentional IP or body logging of paste content in application code
- **Password-protected pastes** store a password hash only; content is not returned until unlock succeeds
- **Self-hosting** is the primary deployment model—you control the data plane

Sensitive logs or credentials should always use **private** (password-protected) pastes and short expiry when possible. A public paste ID is effectively a capability URL: anyone with the link can read a non-private paste.

## Prefer private reporting

If you are unsure whether something is a vulnerability, report it privately. We would rather receive a cautious report than miss a real issue.
