"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import type { LineSelection, ParsedLogLine } from "@/lib/log-lines";
import { isLineSelected } from "@/lib/log-lines";
import { LogLineRow } from "./LogLineRow";

interface VirtualLogListProps {
  lines: ParsedLogLine[];
  selection: LineSelection | null;
  scrollToLineNumber: number | null;
  onLineNumberClick: (lineNumber: number, shiftKey: boolean) => void;
}

const ROW_ESTIMATE = 28;

export function VirtualLogList({
  lines,
  selection,
  scrollToLineNumber,
  onLineNumberClick,
}: VirtualLogListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const line = lines[item.index]!;
          return (
            <div
              key={line.index}
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <LogLineRow
                line={line}
                selected={isLineSelected(line.lineNumber, selection)}
                onLineNumberClick={onLineNumberClick}
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
