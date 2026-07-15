"use client";

import { useState } from "react";

interface JsonInspectorProps {
  value: unknown;
  collapsedLabel: string;
}

export function JsonInspector({ value, collapsedLabel }: JsonInspectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded px-1 font-mono text-left text-vscode-info hover:bg-vscode-line"
        aria-expanded={open}
      >
        <span className="text-vscode-muted" aria-hidden>
          {open ? "▼" : "▶"}
        </span>
        <span className="truncate">{collapsedLabel}</span>
      </button>
      {open ? (
        <div className="mt-1 overflow-x-auto rounded border border-vscode-border bg-vscode-bg/80 p-2">
          <JsonNode value={value} name={null} depth={0} />
        </div>
      ) : null}
    </div>
  );
}

function JsonNode({
  value,
  name,
  depth,
}: {
  value: unknown;
  name: string | null;
  depth: number;
}) {
  const [open, setOpen] = useState(depth < 2);

  if (value !== null && typeof value === "object") {
    const isArray = Array.isArray(value);
    const entries = isArray
      ? (value as unknown[]).map((v, i) => [String(i), v] as const)
      : Object.entries(value as Record<string, unknown>);

    return (
      <div className="font-mono text-xs leading-5" style={{ marginLeft: depth ? 12 : 0 }}>
        <button
          type="button"
          className="text-left text-vscode-fg hover:text-vscode-info"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-vscode-muted">{open ? "▼" : "▶"} </span>
          {name !== null ? (
            <span className="text-vscode-warn">{name}</span>
          ) : null}
          {name !== null ? ": " : ""}
          <span className="text-vscode-muted">
            {isArray ? `Array(${entries.length})` : `Object{${entries.length}}`}
          </span>
        </button>
        {open
          ? entries.map(([k, v]) => (
              <JsonNode key={k} name={k} value={v} depth={depth + 1} />
            ))
          : null}
      </div>
    );
  }

  return (
    <div className="font-mono text-xs leading-5" style={{ marginLeft: depth ? 12 : 0 }}>
      {name !== null ? (
        <>
          <span className="text-vscode-warn">{name}</span>
          <span className="text-vscode-muted">: </span>
        </>
      ) : null}
      <Primitive value={value} />
    </div>
  );
}

function Primitive({ value }: { value: unknown }) {
  if (value === null) return <span className="text-vscode-muted">null</span>;
  if (typeof value === "string")
    return <span className="text-vscode-success">&quot;{value}&quot;</span>;
  if (typeof value === "number" || typeof value === "bigint")
    return <span className="text-vscode-info">{String(value)}</span>;
  if (typeof value === "boolean")
    return <span className="text-vscode-accent">{String(value)}</span>;
  return <span className="text-vscode-fg">{String(value)}</span>;
}
