"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PasteMetadata } from "@/lib/metadata";
import type { LogLevel } from "@/lib/log-lines";
import {
  countLevels,
  defaultLevelFilters,
  filterLogLines,
  formatLineHash,
  joinLinesForExport,
  parseLineHash,
  parseLogLines,
  parseSearchQuery,
  type LevelFilterState,
  type LineSelection,
} from "@/lib/log-lines";
import {
  persistBookmarks,
  readStoredBookmarks,
  toggleBookmark,
} from "@/lib/bookmarks";
import {
  persistWrapMode,
  resolveInitialWrapMode,
  type WrapMode,
} from "@/lib/wrap-mode";
import { ThemeToggle } from "./ThemeToggle";
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
  const [wrapMode, setWrapMode] = useState<WrapMode>("wrap");
  const [wrapMounted, setWrapMounted] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);

  useEffect(() => {
    setWrapMode(resolveInitialWrapMode());
    setWrapMounted(true);
  }, []);

  // Load pins for this paste (local only)
  useEffect(() => {
    setBookmarks(readStoredBookmarks(id));
  }, [id]);

  function toggleWrapMode() {
    const next: WrapMode = wrapMode === "wrap" ? "nowrap" : "wrap";
    setWrapMode(next);
    persistWrapMode(next);
  }

  const onToggleBookmark = useCallback(
    (lineNumber: number) => {
      setBookmarks((prev) => {
        const next = toggleBookmark(prev, lineNumber);
        persistBookmarks(id, next);
        return next;
      });
    },
    [id],
  );

  function clearBookmarks() {
    setBookmarks([]);
    persistBookmarks(id, []);
  }

  function jumpToBookmark(lineNumber: number) {
    // Clear first so re-clicking the same pin still scrolls
    setScrollToLine(null);
    requestAnimationFrame(() => setScrollToLine(lineNumber));
  }

  const bookmarkPreviews = useMemo(() => {
    const byNum = new Map(allLines.map((l) => [l.lineNumber, l] as const));
    return bookmarks.map((n) => {
      const line = byNum.get(n);
      const plain = line?.plain ?? "";
      const preview =
        plain.length > 48 ? `${plain.slice(0, 48)}…` : plain || "(empty)";
      return { lineNumber: n, preview };
    });
  }, [allLines, bookmarks]);

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

  function downloadText(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadRaw() {
    downloadText(rawContent, `paste-${id}.log`);
  }

  function downloadFiltered() {
    downloadText(joinLinesForExport(visibleLines), `paste-${id}-filtered.log`);
  }

  const isFiltered = visibleLines.length !== allLines.length;

  const wrapLabel =
    wrapMode === "wrap" ? "No wrap" : "Wrap";
  const wrapTitle =
    wrapMode === "wrap"
      ? "Switch to no-wrap (horizontal scroll, dense columns)"
      : "Switch to soft-wrap";

  return (
    <div className="flex h-screen min-h-0 flex-col bg-vscode-bg text-vscode-fg">
      <header className="sticky top-0 z-20 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-vscode-border bg-vscode-sidebar px-4 py-2">
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
          <ThemeToggle compact />
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

          <div className="min-h-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-vscode-muted">
                Pins
              </p>
              {bookmarks.length > 0 ? (
                <button
                  type="button"
                  onClick={clearBookmarks}
                  className="text-[10px] text-vscode-muted hover:text-vscode-fg"
                >
                  Clear
                </button>
              ) : null}
            </div>
            {bookmarkPreviews.length === 0 ? (
              <p className="text-[11px] leading-snug text-vscode-muted">
                Star a line to pin it (saved in this browser only).
              </p>
            ) : (
              <ul className="max-h-48 space-y-1 overflow-y-auto">
                {bookmarkPreviews.map(({ lineNumber, preview }) => (
                  <li key={lineNumber}>
                    <button
                      type="button"
                      onClick={() => jumpToBookmark(lineNumber)}
                      className="flex w-full flex-col rounded px-1 py-0.5 text-left hover:bg-vscode-line"
                      title={preview}
                    >
                      <span className="font-mono text-[11px] text-vscode-accent">
                        L{lineNumber}
                      </span>
                      <span className="truncate font-mono text-[10px] text-vscode-muted">
                        {preview}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
            <button
              type="button"
              onClick={downloadFiltered}
              disabled={visibleLines.length === 0}
              title={
                isFiltered
                  ? `Download ${visibleLines.length} visible line(s) after filters`
                  : "Download currently visible lines (same as full paste when unfiltered)"
              }
              className="w-full rounded border border-vscode-border bg-vscode-line px-2 py-1.5 text-xs hover:border-vscode-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isFiltered
                ? `Download filtered (${visibleLines.length})`
                : "Download visible"}
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
          <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-vscode-border bg-vscode-sidebar px-3 py-2">
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
            <button
              type="button"
              onClick={toggleWrapMode}
              className="shrink-0 rounded border border-vscode-border bg-vscode-line px-2 py-1.5 font-mono text-xs text-vscode-fg hover:border-vscode-accent"
              aria-pressed={wrapMode === "nowrap"}
              aria-label={wrapTitle}
              title={wrapTitle}
            >
              {!wrapMounted ? "Wrap" : wrapLabel}
            </button>
          </div>
          <div className="min-h-0 flex-1">
            <VirtualLogList
              lines={visibleLines}
              selection={selection}
              bookmarks={bookmarks}
              wrapMode={wrapMode}
              scrollToLineNumber={scrollToLine}
              onLineNumberClick={onLineNumberClick}
              onToggleBookmark={onToggleBookmark}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
