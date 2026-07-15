"use client";

import type { PasteMetadata } from "@/lib/metadata";

interface BasicPasteViewProps {
  id: string;
  rawContent: string;
  metadata: PasteMetadata;
  createdAt: number;
  expiresAt: number | null;
}

export function BasicPasteView({
  id,
  rawContent,
  metadata,
  createdAt,
  expiresAt,
}: BasicPasteViewProps) {
  return (
    <main className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-vscode-border bg-vscode-sidebar px-4 py-3">
        <div>
          <p className="font-mono text-xs text-vscode-accent">PaperCut</p>
          <h1 className="font-mono text-sm text-vscode-fg">paste/{id}</h1>
        </div>
        <div className="flex flex-wrap gap-3 font-mono text-xs text-vscode-muted">
          <span>{metadata.lineCount} lines</span>
          <span>{metadata.byteLength} bytes</span>
          <span>created {new Date(createdAt).toISOString()}</span>
          {expiresAt ? (
            <span>expires {new Date(expiresAt).toISOString()}</span>
          ) : null}
        </div>
      </header>
      <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-sm leading-6 text-vscode-fg">
        {rawContent}
      </pre>
    </main>
  );
}
