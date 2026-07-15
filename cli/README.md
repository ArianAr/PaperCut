# papercut-cli

Zero-dependency Node.js client for [PaperCut](https://github.com/ArianAr/PaperCut).

> **npm name:** `papercut-cli` (the bare name `papercut` is already taken on npm).  
> **Commands after install:** `papercut` and `papercut-cli` (same binary).

Requires **Node.js ≥ 18** (`fetch` built-in).

## Install

```bash
npx papercut-cli --help
npm install -g papercut-cli

# from this monorepo
pnpm cli --help
node cli/bin.js --help
```

## Usage

```bash
command 2>&1 | papercut-cli --url https://papercut.example.com
# after global install, `papercut` works too:
cat app.log | papercut --expire 1d
yarn build 2>&1 | papercut --private
```

| Flag / env | Description |
|------------|-------------|
| `-p`, `--private` | Password-protect the paste |
| `--expire <time>` | `30m`, `1h`, `1d`, `7d`, … |
| `--url <base>` | Server origin |
| `-V`, `--version` | Print version |
| `-h`, `--help` | Show help |
| `PAPERCUT_URL` | Default base URL |
| `PAPERCUT_PASSWORD` | Non-interactive password for `--private` |

On success, the share URL is printed to **stdout** (script-friendly). A terminal card is written to **stderr**, and the URL is copied to the clipboard when a clipboard tool is available.

## Tests

```bash
pnpm --filter papercut-cli test
# or
node --test cli/test/*.test.js
```

## Publishing (maintainers)

See [PUBLISH.md](./PUBLISH.md) for the npm release checklist and dry-run.
