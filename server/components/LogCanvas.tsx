"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PasteMetadata } from "@/lib/metadata";
import type { LogLevel } from "@/lib/log-lines";
import {
  countLevels,
  defaultLevelFilters,
  filterLogLines,
  formatLineHash,
  parseLineHash,
  parseLogLines,
  parseSearchQuery,
  type LevelFilterState,
  type LineSelection,
} from "@/lib/log-lines";
import { VirtualLogList } from "./VirtualLogList";

const FILTER_LEVELS: LogLevel[] = [
  "TRACE",
  "DEBUG",
  "INFO",
  "WARN",
  "ERROR",
  "FATAL",
  "UNKNOWN",
];

const LEVEL_STYLES: Record<LogLevel, string> = {
  TRACE: "border-vscode-debug text-vscode-debug",
  DEBUG: "border-vscode-debug text-vscode-debug",
  INFO: "border-vscode-info text-vscode-info",
  WARN: "border-vscode-warn text-vscode-warn",
  ERROR: "border-vscode-error text-vscode-error",
  FATAL: "border-vscode-error text-vscode-error",
  UNKNOWN: "border-vscode-muted text-vscode-muted",
};

interface LogCanvasProps {
  id: string;
  rawContent: string;
  metadata: PasteMetadata;
  createdAt: number;
  expiresAt: number | null;
}

export function LogCanvas({
  id,
  rawContent,
  metadata,
  createdAt,
  expiresAt,
}: LogCanvasProps) {
  const allLines = useMemo(() => parseLogLines(rawContent), [rawContent]);
  const levelCounts = useMemo(() => countLevels(allLines), [allLines]);

  const [levels, setLevels] = useState<LevelFilterState>(() =>
    defaultLevelFilters(),
  );
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<LineSelection | null>(null);
  const [scrollToLine, setScrollToLine] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const query = useMemo(() => parseSearchQuery(search), [search]);
  const visibleLines = useMemo(
    () => filterLogLines(allLines, levels, query),
    [allLines, levels, query],
  );

  // Restore selection + scroll from URL hash
  useEffect(() => {
    const applyHash = () => {
      const sel = parseLineHash(window.location.hash);
      if (sel) {
        setSelection(sel);
        setScrollToLine(sel.start);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  const updateSelection = useCallback((next: LineSelection | null) => {
    setSelection(next);
    const hash = formatLineHash(next);
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    window.history.replaceState(null, "", url);
  }, []);

  const onLineNumberClick = useCallback(
    (lineNumber: number, shiftKey: boolean) => {
      setSelection((prev) => {
        let next: LineSelection;
        if (shiftKey && prev) {
          const start = Math.min(prev.start, lineNumber);
          const end = Math.max(prev.end, lineNumber);
          next = { start, end };
        } else {
          next = { start: lineNumber, end: lineNumber };
        }
        const hash = formatLineHash(next);
        const url = `${window.location.pathname}${window.location.search}${hash}`;
        window.history.replaceState(null, "", url);
        return next;
      });
    },
    [],
  );

  function toggleLevel(level: LogLevel) {
    setLevels((prev) => ({ ...prev, [level]: !prev[level] }));
  }

  async function copyRaw() {
    try {
      await navigator.clipboard.writeText(rawContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function downloadRaw() {
    const blob = new Blob([rawContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paste-${id}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex h-screen min-h-0 flex-col bg-vscode-bg text-vscode-fg">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-vscode-border bg-vscode-sidebar px-4 py-2">
        <div className="min-w-0">
          <p className="font-mono text-xs text-vscode-accent">PaperCut</p>
          <h1 className="truncate font-mono text-sm">paste/{id}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-vscode-muted">
          <span>
            {visibleLines.length}/{metadata.lineCount} lines
          </span>
          <span>{metadata.byteLength} B</span>
          <span title={new Date(createdAt).toISOString()}>
            {new Date(createdAt).toLocaleString()}
          </span>
          {expiresAt ? (
            <span title="Expires">exp {new Date(expiresAt).toLocaleString()}</span>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-52 shrink-0 flex-col gap-4 border-r border-vscode-border bg-vscode-sidebar p-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-vscode-muted">
              Levels
            </p>
            <ul className="space-y-1">
              {FILTER_LEVELS.map((level) => (
                <li key={level}>
                  <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-vscode-line">
                    <input
                      type="checkbox"
                      checked={levels[level]}
                      onChange={() => toggleLevel(level)}
                      className="accent-vscode-accent"
                    />
                    <span className={`font-mono ${LEVEL_STYLES[level]}`}>
                      {level}
                    </span>
                    <span className="ml-auto text-vscode-muted">
                      {levelCounts[level]}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto space-y-2">
            <button
              type="button"
              onClick={copyRaw}
              className="w-full rounded border border-vscode-border bg-vscode-line px-2 py-1.5 text-xs hover:border-vscode-accent"
            >
              {copied ? "Copied raw" : "Copy raw"}
            </button>
            <button
              type="button"
              onClick={downloadRaw}
              className="w-full rounded border border-vscode-border bg-vscode-line px-2 py-1.5 text-xs hover:border-vscode-accent"
            >
              Download .log
            </button>
            {selection ? (
              <button
                type="button"
                onClick={() => updateSelection(null)}
                className="w-full rounded border border-vscode-border px-2 py-1.5 text-xs text-vscode-muted hover:text-vscode-fg"
              >
                Clear {formatLineHash(selection)}
              </button>
            ) : null}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-vscode-border bg-vscode-sidebar px-3 py-2">
            <label className="sr-only" htmlFor="log-search">
              Search
            </label>
            <input
              id="log-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Filter… use /regex/i for regex'
              className="w-full rounded border border-vscode-border bg-vscode-bg px-3 py-1.5 font-mono text-sm outline-none focus:border-vscode-accent"
              spellCheck={false}
              autoComplete="off"
            />
            {query.error ? (
              <span className="shrink-0 text-xs text-vscode-error" title={query.error}>
                bad regex
              </span>
            ) : null}
          </div>
          <div className="min-h-0 flex-1">
            <VirtualLogList
              lines={visibleLines}
              selection={selection}
              scrollToLineNumber={scrollToLine}
              onLineNumberClick={onLineNumberClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
