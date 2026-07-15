# papercut (CLI)

Zero-dependency Node.js client for [PaperCut](https://github.com/ArianAr/PaperCut).

Requires **Node.js ≥ 18** (`fetch` built-in).

## Install

```bash
# from monorepo
pnpm cli --help
# or
node cli/bin.js --help

# when published
npm install -g papercut
```

## Usage

```bash
command 2>&1 | papercut --url https://papercut.example.com
cat app.log | papercut --expire 1d
yarn build 2>&1 | papercut --private
```

| Flag / env | Description |
|------------|-------------|
| `-p`, `--private` | Password-protect the paste |
| `--expire <time>` | `30m`, `1h`, `1d`, `7d`, … |
| `--url <base>` | Server origin |
| `PAPERCUT_URL` | Default base URL |
| `PAPERCUT_PASSWORD` | Non-interactive password for `--private` |

On success, the share URL is printed to **stdout** (script-friendly). A terminal card is written to **stderr**, and the URL is copied to the clipboard when a clipboard tool is available.

## Tests

```bash
pnpm --filter papercut test
# or
node --test cli/test/**/*.test.js
```
