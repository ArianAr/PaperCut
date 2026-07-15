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
  HIGHLIGHT_COLOR_OPTIONS,
  MAX_HIGHLIGHT_RULES,
  compileHighlightRules,
  createHighlightRule,
  persistHighlightRules,
  readStoredHighlightRules,
  validateHighlightPattern,
  type HighlightColorId,
  type HighlightRule,
} from "@/lib/highlight-rules";
import {
  buildCompareSearch,
  normalizeCompareId,
  parseComparePasteResponse,
} from "@/lib/compare";
import {
  buildTimelineIndex,
  formatTimelineTime,
  nearestTimelinePoint,
  scrubToTimeMs,
} from "@/lib/timestamps";
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
  /** Optional second paste id from `?compare=` */
  initialCompareId?: string;
}

export function LogCanvas({
  id,
  rawContent,
  metadata,
  createdAt,
  expiresAt,
  initialCompareId,
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
  const [highlightRules, setHighlightRules] = useState<HighlightRule[]>([]);
  const [draftPattern, setDraftPattern] = useState("");
  const [draftColor, setDraftColor] = useState<HighlightColorId>("accent");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [scrubRatio, setScrubRatio] = useState(0);
  const [scrubLabel, setScrubLabel] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(() =>
    normalizeCompareId(initialCompareId ?? null),
  );
  const [compareDraft, setCompareDraft] = useState(
    () => normalizeCompareId(initialCompareId ?? null) ?? "",
  );
  const [compareRaw, setCompareRaw] = useState<string | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  useEffect(() => {
    setWrapMode(resolveInitialWrapMode());
    setHighlightRules(readStoredHighlightRules());
    setWrapMounted(true);
  }, []);

  // Load pins for this paste (local only)
  useEffect(() => {
    setBookmarks(readStoredBookmarks(id));
  }, [id]);

  // Load compare paste client-side (public unlock cookie if already unlocked)
  useEffect(() => {
    if (!compareId || compareId === id) {
      setCompareRaw(null);
      setCompareError(
        compareId === id ? "Cannot compare a paste with itself." : null,
      );
      setCompareLoading(false);
      return;
    }

    let cancelled = false;
    setCompareLoading(true);
    setCompareError(null);
    setCompareRaw(null);

    (async () => {
      try {
        const res = await fetch(`/api/pastes/${encodeURIComponent(compareId)}`, {
          credentials: "same-origin",
        });
        let body: unknown = null;
        try {
          body = await res.json();
        } catch {
          body = null;
        }
        if (cancelled) return;
        const parsed = parseComparePasteResponse(res.status, body, compareId);
        if (!parsed.ok) {
          setCompareError(parsed.error);
          setCompareRaw(null);
        } else {
          setCompareRaw(parsed.rawContent);
          setCompareError(null);
        }
      } catch {
        if (!cancelled) {
          setCompareError("Network error loading second paste.");
          setCompareRaw(null);
        }
      } finally {
        if (!cancelled) setCompareLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [compareId, id]);

  function applyCompare(rawId: string) {
    const next = normalizeCompareId(rawId);
    if (!next) {
      setCompareError("Invalid paste id.");
      return;
    }
    if (next === id) {
      setCompareError("Cannot compare a paste with itself.");
      return;
    }
    setCompareId(next);
    setCompareDraft(next);
    const url = `${window.location.pathname}${buildCompareSearch(window.location.search, next)}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }

  function clearCompare() {
    setCompareId(null);
    setCompareDraft("");
    setCompareRaw(null);
    setCompareError(null);
    const url = `${window.location.pathname}${buildCompareSearch(window.location.search, null)}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }

  const compareLines = useMemo(
    () => (compareRaw != null ? parseLogLines(compareRaw) : []),
    [compareRaw],
  );

  const compiledHighlights = useMemo(
    () => compileHighlightRules(highlightRules),
    [highlightRules],
  );

  function updateHighlightRules(next: HighlightRule[]) {
    setHighlightRules(next);
    persistHighlightRules(next);
  }

  function addHighlightRule() {
    const check = validateHighlightPattern(draftPattern, "i");
    if (!check.ok) {
      setDraftError(check.error);
      return;
    }
    if (highlightRules.length >= MAX_HIGHLIGHT_RULES) {
      setDraftError(`Max ${MAX_HIGHLIGHT_RULES} rules`);
      return;
    }
    setDraftError(null);
    updateHighlightRules([
      ...highlightRules,
      createHighlightRule({
        pattern: draftPattern.trim(),
        flags: "i",
        color: draftColor,
      }),
    ]);
    setDraftPattern("");
  }

  function removeHighlightRule(ruleId: string) {
    updateHighlightRules(highlightRules.filter((r) => r.id !== ruleId));
  }

  function toggleHighlightRule(ruleId: string) {
    updateHighlightRules(
      highlightRules.map((r) =>
        r.id === ruleId ? { ...r, enabled: !r.enabled } : r,
      ),
    );
  }

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

  const visibleCompareLines = useMemo(
    () =>
      compareRaw != null
        ? filterLogLines(compareLines, levels, query)
        : [],
    [compareRaw, compareLines, levels, query],
  );

  const comparing = compareId != null && compareId !== id;

  // Timeline from currently visible lines so jumps always land in the list
  const timeline = useMemo(
    () => buildTimelineIndex(visibleLines),
    [visibleLines],
  );

  function onTimelineScrub(ratio: number) {
    setScrubRatio(ratio);
    if (!timeline) {
      setScrubLabel(null);
      return;
    }
    const t = scrubToTimeMs(timeline, ratio);
    const point = nearestTimelinePoint(timeline, t);
    setScrubLabel(
      `${formatTimelineTime(point.timeMs)} · L${point.lineNumber}`,
    );
    setScrollToLine(null);
    requestAnimationFrame(() => setScrollToLine(point.lineNumber));
  }

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

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
            <div>
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
                <ul className="max-h-32 space-y-1 overflow-y-auto">
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

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-vscode-muted">
                Highlights
              </p>
              <p className="mb-2 text-[10px] leading-snug text-vscode-muted">
                Regex → color (this browser only).
              </p>
              <ul className="mb-2 max-h-36 space-y-1 overflow-y-auto">
                {highlightRules.map((rule) => {
                  const swatch =
                    HIGHLIGHT_COLOR_OPTIONS.find((c) => c.id === rule.color)
                      ?.swatchClass ?? "bg-vscode-accent";
                  return (
                    <li
                      key={rule.id}
                      className="flex items-start gap-1 rounded px-0.5 py-0.5 hover:bg-vscode-line"
                    >
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={() => toggleHighlightRule(rule.id)}
                        className="mt-0.5 accent-vscode-accent"
                        aria-label={`Enable highlight ${rule.pattern}`}
                      />
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-sm ${swatch}`}
                        aria-hidden
                      />
                      <span
                        className="min-w-0 flex-1 truncate font-mono text-[10px] text-vscode-fg"
                        title={`/${rule.pattern}/${rule.flags}`}
                      >
                        /{rule.pattern}/
                      </span>
                      <button
                        type="button"
                        onClick={() => removeHighlightRule(rule.id)}
                        className="shrink-0 text-[10px] text-vscode-muted hover:text-vscode-error"
                        aria-label={`Remove highlight ${rule.pattern}`}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="space-y-1">
                <input
                  type="text"
                  value={draftPattern}
                  onChange={(e) => {
                    setDraftPattern(e.target.value);
                    setDraftError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addHighlightRule();
                    }
                  }}
                  placeholder="regex pattern"
                  className="w-full rounded border border-vscode-border bg-vscode-bg px-1.5 py-1 font-mono text-[11px] outline-none focus:border-vscode-accent"
                  spellCheck={false}
                  autoComplete="off"
                  aria-label="New highlight pattern"
                />
                <div className="flex items-center gap-1">
                  <select
                    value={draftColor}
                    onChange={(e) =>
                      setDraftColor(e.target.value as HighlightColorId)
                    }
                    className="min-w-0 flex-1 rounded border border-vscode-border bg-vscode-bg px-1 py-1 font-mono text-[10px] text-vscode-fg"
                    aria-label="Highlight color"
                  >
                    {HIGHLIGHT_COLOR_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addHighlightRule}
                    className="shrink-0 rounded border border-vscode-border bg-vscode-line px-2 py-1 text-[10px] hover:border-vscode-accent"
                  >
                    Add
                  </button>
                </div>
                {draftError ? (
                  <p className="text-[10px] text-vscode-error" role="alert">
                    {draftError}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-1 border-t border-vscode-border pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-vscode-muted">
              Compare
            </p>
            <div className="flex gap-1">
              <input
                type="text"
                value={compareDraft}
                onChange={(e) => setCompareDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyCompare(compareDraft);
                  }
                }}
                placeholder="paste id"
                className="min-w-0 flex-1 rounded border border-vscode-border bg-vscode-bg px-1.5 py-1 font-mono text-[11px] outline-none focus:border-vscode-accent"
                spellCheck={false}
                autoComplete="off"
                aria-label="Compare paste id"
              />
              <button
                type="button"
                onClick={() => applyCompare(compareDraft)}
                className="shrink-0 rounded border border-vscode-border bg-vscode-line px-2 py-1 text-[10px] hover:border-vscode-accent"
              >
                Go
              </button>
            </div>
            {comparing ? (
              <button
                type="button"
                onClick={clearCompare}
                className="text-[10px] text-vscode-muted hover:text-vscode-fg"
              >
                Clear compare
              </button>
            ) : null}
            {compareLoading ? (
              <p className="text-[10px] text-vscode-muted">Loading…</p>
            ) : null}
            {compareError ? (
              <p className="text-[10px] text-vscode-error" role="alert">
                {compareError}
              </p>
            ) : null}
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
          {timeline ? (
            <div className="flex shrink-0 flex-col gap-1 border-b border-vscode-border bg-vscode-sidebar px-3 py-2">
              <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-vscode-muted">
                <span title="Earliest timestamp in visible lines">
                  {formatTimelineTime(timeline.minMs)}
                </span>
                <span className="truncate text-vscode-accent">
                  {scrubLabel ??
                    `${timeline.points.length} timestamps · scrub to jump`}
                </span>
                <span title="Latest timestamp in visible lines">
                  {formatTimelineTime(timeline.maxMs)}
                </span>
              </div>
              <label className="sr-only" htmlFor="timeline-scrub">
                Timeline scrubber
              </label>
              <input
                id="timeline-scrub"
                type="range"
                min={0}
                max={1000}
                step={1}
                value={Math.round(scrubRatio * 1000)}
                onChange={(e) =>
                  onTimelineScrub(Number.parseInt(e.target.value, 10) / 1000)
                }
                className="w-full accent-vscode-accent"
              />
            </div>
          ) : null}
          <div
            className={`min-h-0 flex-1 ${comparing && compareRaw != null ? "flex" : ""}`}
          >
            <div
              className={
                comparing && compareRaw != null
                  ? "flex min-h-0 min-w-0 flex-1 flex-col border-r border-vscode-border"
                  : "h-full min-h-0"
              }
            >
              {comparing && compareRaw != null ? (
                <p className="shrink-0 border-b border-vscode-border bg-vscode-sidebar px-2 py-1 font-mono text-[10px] text-vscode-muted">
                  A · paste/{id}
                </p>
              ) : null}
              <div className="min-h-0 flex-1">
                <VirtualLogList
                  lines={visibleLines}
                  selection={selection}
                  bookmarks={bookmarks}
                  highlightRules={compiledHighlights}
                  wrapMode={wrapMode}
                  scrollToLineNumber={scrollToLine}
                  onLineNumberClick={onLineNumberClick}
                  onToggleBookmark={onToggleBookmark}
                />
              </div>
            </div>
            {comparing && compareRaw != null ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <p className="shrink-0 border-b border-vscode-border bg-vscode-sidebar px-2 py-1 font-mono text-[10px] text-vscode-muted">
                  B · paste/{compareId}
                </p>
                <div className="min-h-0 flex-1">
                  <VirtualLogList
                    lines={visibleCompareLines}
                    selection={null}
                    bookmarks={[]}
                    highlightRules={compiledHighlights}
                    wrapMode={wrapMode}
                    scrollToLineNumber={null}
                    onLineNumberClick={() => {
                      /* selection only for primary pane */
                    }}
                    onToggleBookmark={() => {
                      /* pins only for primary paste */
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
