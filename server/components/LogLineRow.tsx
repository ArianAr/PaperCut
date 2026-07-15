"use client";

import { memo } from "react";
import { ansiToHtml } from "@/lib/ansi-html";
import type { ParsedLogLine } from "@/lib/log-lines";
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
  onLineNumberClick: (lineNumber: number, shiftKey: boolean) => void;
  style?: React.CSSProperties;
}

export const LogLineRow = memo(function LogLineRow({
  line,
  selected,
  onLineNumberClick,
  style,
}: LogLineRowProps) {
  return (
    <div
      style={style}
      data-line={line.lineNumber}
      className={`flex min-w-0 items-start border-b border-vscode-line/40 font-mono text-[13px] leading-6 ${
        selected ? "bg-vscode-selection/50" : "hover:bg-vscode-line/30"
      }`}
    >
      <button
        type="button"
        onClick={(e) => onLineNumberClick(line.lineNumber, e.shiftKey)}
        className="w-14 shrink-0 select-none pr-2 text-right text-vscode-gutter hover:text-vscode-fg"
        aria-label={`Line ${line.lineNumber}`}
      >
        {line.lineNumber}
      </button>
      <span
        className={`mt-1.5 mr-2 h-3 w-1 shrink-0 rounded-sm ${LEVEL_BAR[line.level] ?? "bg-transparent"}`}
        title={line.level}
        aria-hidden
      />
      {line.isJson && line.jsonValue !== null ? (
        <JsonInspector
          value={line.jsonValue}
          collapsedLabel={line.plain.length > 120 ? `${line.plain.slice(0, 120)}…` : line.plain}
        />
      ) : (
        <code
          className="min-w-0 flex-1 whitespace-pre-wrap break-all pr-3 text-vscode-fg"
          dangerouslySetInnerHTML={{ __html: ansiToHtml(line.raw) }}
        />
      )}
    </div>
  );
});
