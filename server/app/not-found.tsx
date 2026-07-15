import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16 text-center">
      <div className="mb-4 flex justify-end">
        <ThemeToggle compact />
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-vscode-fg">Not found</h1>
      <p className="text-sm text-vscode-muted">
        This paste does not exist or has expired.
      </p>
      <Link
        href="/"
        className="mt-6 text-sm text-vscode-info underline-offset-2 hover:underline"
      >
        Back home
      </Link>
    </main>
  );
}
