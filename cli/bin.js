#!/usr/bin/env node
"use strict";

/**
 * PaperCut CLI — zero npm dependencies.
 * Reads stdin, uploads to a PaperCut server, prints a share card, copies URL.
 */

const { spawnSync } = require("node:child_process");
const { createInterface } = require("node:readline");
const { stdin, stdout, stderr, exit, env, argv, platform } = require("node:process");

const DEFAULT_URL = "http://localhost:3000";

function printHelp() {
  stdout.write(`papercut — pipe terminal output to an interactive log canvas

Usage:
  <command> | papercut [options]
  papercut [options] < file.log

Options:
  -p, --private          Password-protect the paste
  --expire <time>        Auto-delete after duration (e.g. 30m, 1h, 1d, 7d)
  --url <base>           Server base URL (default: env PAPERCUT_URL or ${DEFAULT_URL})
  -h, --help             Show this help

Environment:
  PAPERCUT_URL           Default server base URL
  PAPERCUT_PASSWORD      Password for --private (skips interactive prompt)

Examples:
  yarn build 2>&1 | papercut
  cat app.log | papercut --expire 1d --url https://paste.example.com
  some-cmd 2>&1 | papercut --private
`);
}

/**
 * @param {string[]} args
 * @returns {{ help: boolean, private: boolean, expire?: string, url: string, errors: string[] }}
 */
function parseArgs(args) {
  /** @type {{ help: boolean, private: boolean, expire?: string, url: string, errors: string[] }} */
  const opts = {
    help: false,
    private: false,
    url: (env.PAPERCUT_URL || DEFAULT_URL).replace(/\/$/, ""),
    errors: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-h" || arg === "--help") {
      opts.help = true;
    } else if (arg === "-p" || arg === "--private") {
      opts.private = true;
    } else if (arg === "--expire") {
      const value = args[++i];
      if (!value || value.startsWith("-")) {
        opts.errors.push("--expire requires a value (e.g. 1h, 1d)");
      } else {
        opts.expire = value;
      }
    } else if (arg.startsWith("--expire=")) {
      opts.expire = arg.slice("--expire=".length);
    } else if (arg === "--url") {
      const value = args[++i];
      if (!value || value.startsWith("-")) {
        opts.errors.push("--url requires a value");
      } else {
        opts.url = value.replace(/\/$/, "");
      }
    } else if (arg.startsWith("--url=")) {
      opts.url = arg.slice("--url=".length).replace(/\/$/, "");
    } else {
      opts.errors.push(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

/**
 * @returns {Promise<string>}
 */
function readStdin() {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = [];
    stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stdin.on("error", reject);
  });
}

/**
 * @param {string} question
 * @returns {Promise<string>}
 */
function promptHidden(question) {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY) {
      reject(new Error("Password required but stdin is not a TTY; set PAPERCUT_PASSWORD"));
      return;
    }

    const rl = createInterface({ input: stdin, output: stderr });
    stderr.write(question);

    // Best-effort mute (not fully secure on all terminals, but fine for CLI prompt)
    const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true);

    let value = "";
    /** @param {Buffer} buf */
    const onData = (buf) => {
      const s = buf.toString("utf8");
      for (const ch of s) {
        if (ch === "\n" || ch === "\r" || ch === "\u0004") {
          cleanup();
          stderr.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          cleanup();
          reject(new Error("Interrupted"));
          return;
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += ch;
      }
    };

    function cleanup() {
      stdin.removeListener("data", onData);
      if (stdin.setRawMode) stdin.setRawMode(Boolean(wasRaw));
      rl.close();
    }

    stdin.on("data", onData);
  });
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function copyToClipboard(text) {
  /** @type {Array<{ cmd: string, args: string[], input?: boolean, shell?: boolean }>} */
  const candidates =
    platform === "darwin"
      ? [{ cmd: "pbcopy", args: [], input: true }]
      : platform === "win32"
        ? [{ cmd: "clip", args: [], input: true }]
        : [
            { cmd: "wl-copy", args: [], input: true },
            { cmd: "xclip", args: ["-selection", "clipboard"], input: true },
            { cmd: "xsel", args: ["--clipboard", "--input"], input: true },
          ];

  for (const c of candidates) {
    try {
      const result = spawnSync(c.cmd, c.args, {
        input: text,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      if (result.status === 0) return true;
    } catch {
      // try next
    }
  }
  return false;
}

/**
 * @param {string} url
 * @param {{ id: string, copied: boolean, expiresAt: number | null }} meta
 */
function printCard(url, meta) {
  const lines = [
    "PaperCut",
    "",
    `  URL   ${url}`,
    `  ID    ${meta.id}`,
  ];
  if (meta.expiresAt) {
    lines.push(`  Exp   ${new Date(meta.expiresAt).toISOString()}`);
  }
  lines.push(
    "",
    meta.copied ? "  ✓  Copied to clipboard" : "  ·  Clipboard unavailable",
  );

  const width = Math.max(...lines.map((l) => l.length), 24);
  const top = `┌${"─".repeat(width + 2)}┐`;
  const bot = `└${"─".repeat(width + 2)}┘`;
  const body = lines.map((l) => `│ ${l.padEnd(width, " ")} │`).join("\n");
  stderr.write(`\n${top}\n${body}\n${bot}\n\n`);
  // Always print bare URL on stdout for scripting
  stdout.write(`${url}\n`);
}

/**
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {string} opts.content
 * @param {string} [opts.expire]
 * @param {string} [opts.password]
 * @param {typeof fetch} [opts.fetchImpl]
 */
async function uploadPaste(opts) {
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch is not available; use Node.js 18+");
  }

  /** @type {Record<string, string>} */
  const body = { content: opts.content };
  if (opts.expire) body.expire = opts.expire;
  if (opts.password) body.password = opts.password;

  const res = await fetchImpl(`${opts.baseUrl}/api/pastes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  /** @type {any} */
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.error || text || res.statusText;
    throw new Error(`Upload failed (${res.status}): ${msg}`);
  }

  if (!data?.url || !data?.id) {
    throw new Error("Upload succeeded but response missing url/id");
  }

  return data;
}

async function main() {
  const opts = parseArgs(argv.slice(2));
  if (opts.help) {
    printHelp();
    exit(0);
  }
  if (opts.errors.length) {
    for (const e of opts.errors) stderr.write(`Error: ${e}\n`);
    printHelp();
    exit(1);
  }

  if (stdin.isTTY) {
    stderr.write(
      "Error: no stdin data. Pipe output into papercut, e.g. `cmd | papercut`\n",
    );
    exit(1);
  }

  const content = await readStdin();
  if (!content || content.length === 0) {
    stderr.write("Error: empty input\n");
    exit(1);
  }

  /** @type {string | undefined} */
  let password;
  if (opts.private) {
    password = env.PAPERCUT_PASSWORD || (await promptHidden("Paste password: "));
    if (!password) {
      stderr.write("Error: password must not be empty\n");
      exit(1);
    }
  }

  try {
    const data = await uploadPaste({
      baseUrl: opts.url,
      content,
      expire: opts.expire,
      password,
    });
    const copied = copyToClipboard(data.url);
    printCard(data.url, {
      id: data.id,
      copied,
      expiresAt: data.expiresAt ?? null,
    });
    exit(0);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stderr.write(`Error: ${message}\n`);
    exit(1);
  }
}

// Export for tests without running main
module.exports = {
  parseArgs,
  uploadPaste,
  copyToClipboard,
  printCard,
  readStdin,
  DEFAULT_URL,
};

if (require.main === module) {
  main();
}
