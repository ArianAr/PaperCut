# papercut (CLI)

Zero-dependency Node.js client for [PaperCut](https://github.com/ArianAr/PaperCut).

## Install

```bash
# from monorepo
pnpm cli --help

# or globally (when published)
npm install -g papercut
```

## Usage

```bash
command 2>&1 | papercut --url https://papercut.example.com
```

See the [root README](../README.md) for flags and environment variables.

> Implementation lands in a follow-up PR; this package metadata reserves the workspace package name.
