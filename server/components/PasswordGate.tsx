"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

interface PasswordGateProps {
  pasteId: string;
}

export function PasswordGate({ pasteId }: PasswordGateProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/pastes/${pasteId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Unlock failed");
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
      <div className="mb-4 flex justify-end">
        <ThemeToggle compact />
      </div>
      <div className="rounded-lg border border-vscode-border bg-vscode-sidebar p-6 shadow-xl">
        <h1 className="mb-1 text-lg font-semibold text-vscode-fg">
          Protected paste
        </h1>
        <p className="mb-6 text-sm text-vscode-muted">
          This paste is password-protected. Enter the password to view it.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm text-vscode-muted">
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-vscode-border bg-vscode-bg px-3 py-2 font-mono text-vscode-fg outline-none focus:border-vscode-accent"
              required
            />
          </label>
          {error ? (
            <p className="text-sm text-vscode-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded bg-vscode-accent px-3 py-2 text-sm font-medium text-white hover:brightness-110 disabled:opacity-60"
          >
            {pending ? "Unlocking…" : "Unlock"}
          </button>
        </form>
      </div>
    </main>
  );
}
