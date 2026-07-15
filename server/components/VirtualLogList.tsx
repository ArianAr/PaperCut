"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import type { LineSelection, ParsedLogLine } from "@/lib/log-lines";
import { isLineSelected } from "@/lib/log-lines";
import { isBookmarked } from "@/lib/bookmarks";
import type { WrapMode } from "@/lib/wrap-mode";
import { LogLineRow } from "./LogLineRow";

interface VirtualLogListProps {
  lines: ParsedLogLine[];
  selection: LineSelection | null;
  bookmarks: readonly number[];
  wrapMode: WrapMode;
  scrollToLineNumber: number | null;
  onLineNumberClick: (lineNumber: number, shiftKey: boolean) => void;
  onToggleBookmark: (lineNumber: number) => void;
}

const ROW_ESTIMATE = 28;

export function VirtualLogList({
  lines,
  selection,
  bookmarks,
  wrapMode,
  scrollToLineNumber,
  onLineNumberClick,
  onToggleBookmark,
}: VirtualLogListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const bookmarkSet = new Set(bookmarks);

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 20,
  });

  useEffect(() => {
    if (scrollToLineNumber == null) return;
    const index = lines.findIndex((l) => l.lineNumber === scrollToLineNumber);
    if (index >= 0) {
      virtualizer.scrollToIndex(index, { align: "center" });
    }
  }, [scrollToLineNumber, lines, virtualizer]);

  // Re-measure row heights when wrap mode changes (wrap vs single-line height).
  useEffect(() => {
    virtualizer.measure();
  }, [wrapMode, virtualizer]);

  return (
    <div
      ref={parentRef}
      className="h-full overflow-auto"
      data-wrap-mode={wrapMode}
    >
      <div
        className={
          wrapMode === "nowrap" ? "relative min-w-full w-max" : "relative w-full"
        }
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const line = lines[item.index]!;
          return (
            <div
              key={line.index}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className={
                wrapMode === "nowrap"
                  ? "absolute top-0 left-0 min-w-full w-max"
                  : "absolute top-0 left-0 w-full"
              }
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <LogLineRow
                line={line}
                selected={isLineSelected(line.lineNumber, selection)}
                bookmarked={isBookmarked(bookmarkSet, line.lineNumber)}
                wrapMode={wrapMode}
                onLineNumberClick={onLineNumberClick}
                onToggleBookmark={onToggleBookmark}
              />
            </div>
          );
        })}
      </div>
      {lines.length === 0 ? (
        <p className="p-6 text-center font-mono text-sm text-vscode-muted">
          No lines match the current filters.
        </p>
      ) : null}
    </div>
  );
}
