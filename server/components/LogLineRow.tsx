"use client";

import { memo } from "react";
import { ansiToHtml } from "@/lib/ansi-html";
import type { ParsedLogLine } from "@/lib/log-lines";
import type { WrapMode } from "@/lib/wrap-mode";
import { JsonInspector } from "./JsonInspector";

const LEVEL_BAR: Record<string, string> = {
  TRACE: "bg-vscode-debug",
  DEBUG: "bg-vscode-debug",
  INFO: "bg-vscode-info",
  WARN: "bg-vscode-warn",
  ERROR: "bg-vscode-error",
  FATAL: "bg-vscode-error",
  UNKNOWN: "bg-transparent",
};

interface LogLineRowProps {
  line: ParsedLogLine;
  selected: boolean;
  bookmarked: boolean;
  wrapMode: WrapMode;
  onLineNumberClick: (lineNumber: number, shiftKey: boolean) => void;
  onToggleBookmark: (lineNumber: number) => void;
  style?: React.CSSProperties;
}

export const LogLineRow = memo(function LogLineRow({
  line,
  selected,
  bookmarked,
  wrapMode,
  onLineNumberClick,
  onToggleBookmark,
  style,
}: LogLineRowProps) {
  const nowrap = wrapMode === "nowrap";
  const contentClass = nowrap
    ? "min-w-0 flex-1 whitespace-pre pr-3 text-vscode-fg"
    : "min-w-0 flex-1 whitespace-pre-wrap break-all pr-3 text-vscode-fg";

  // Opaque sticky gutter so content does not show through on horizontal scroll.
  const gutterBg = selected ? "bg-vscode-selection" : "bg-vscode-bg";

  return (
    <div
      style={style}
      data-line={line.lineNumber}
      data-bookmarked={bookmarked ? "true" : undefined}
      className={`flex min-w-0 items-start border-b border-vscode-line/40 font-mono text-[13px] leading-6 ${
        nowrap ? "w-max min-w-full" : "w-full"
      } ${selected ? "bg-vscode-selection/50" : "hover:bg-vscode-line/30"} ${
        bookmarked && !selected ? "bg-vscode-accent/5" : ""
      }`}
    >
      <div
        className={`sticky left-0 z-10 flex shrink-0 items-start ${gutterBg}`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleBookmark(line.lineNumber);
          }}
          className={`w-5 shrink-0 select-none text-center text-[11px] leading-6 ${
            bookmarked
              ? "text-vscode-accent"
              : "text-vscode-gutter/50 hover:text-vscode-accent"
          }`}
          aria-label={
            bookmarked
              ? `Unpin line ${line.lineNumber}`
              : `Pin line ${line.lineNumber}`
          }
          aria-pressed={bookmarked}
          title={bookmarked ? "Unpin line" : "Pin line"}
        >
          {bookmarked ? "★" : "☆"}
        </button>
        <button
          type="button"
          onClick={(e) => onLineNumberClick(line.lineNumber, e.shiftKey)}
          className="w-12 select-none pr-1 text-right text-vscode-gutter hover:text-vscode-fg"
          aria-label={`Line ${line.lineNumber}`}
        >
          {line.lineNumber}
        </button>
        <span
          className={`mt-1.5 mr-2 h-3 w-1 rounded-sm ${LEVEL_BAR[line.level] ?? "bg-transparent"}`}
          title={line.level}
          aria-hidden
        />
      </div>
      {line.isJson && line.jsonValue !== null ? (
        <JsonInspector
          value={line.jsonValue}
          collapsedLabel={
            line.plain.length > 120 ? `${line.plain.slice(0, 120)}…` : line.plain
          }
        />
      ) : (
        <code
          className={contentClass}
          dangerouslySetInnerHTML={{ __html: ansiToHtml(line.raw) }}
        />
      )}
    </div>
  );
});
