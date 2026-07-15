export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="space-y-3">
        <p className="font-mono text-sm text-vscode-accent">PaperCut</p>
        <h1 className="text-3xl font-semibold tracking-tight text-vscode-fg sm:text-4xl">
          Interactive terminal pastebin
        </h1>
        <p className="max-w-2xl text-vscode-muted">
          Pipe any terminal output to a secure share link. Open it in the browser
          as a log canvas with ANSI colors, filters, search, and line links.
        </p>
      </header>

      <section className="rounded-lg border border-vscode-border bg-vscode-sidebar p-5 font-mono text-sm shadow-lg">
        <p className="mb-3 text-vscode-muted"># quick start</p>
        <pre className="overflow-x-auto whitespace-pre-wrap text-vscode-fg">
          {`yarn build 2>&1 | papercut --url http://localhost:3000
# → http://localhost:3000/paste/<id>`}
        </pre>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {[
          ["Zero-dep CLI", "Read stdin, upload, copy the share URL."],
          ["ANSI canvas", "True terminal colors in the browser."],
          ["Private pastes", "Password gate with hashed credentials."],
          ["Self-hosted", "SQLite + Docker. No analytics."],
        ].map(([title, body]) => (
          <article
            key={title}
            className="rounded-lg border border-vscode-border bg-vscode-line/40 p-4"
          >
            <h2 className="mb-1 font-medium text-vscode-fg">{title}</h2>
            <p className="text-sm text-vscode-muted">{body}</p>
          </article>
        ))}
      </section>

      <footer className="border-t border-vscode-border pt-6 text-sm text-vscode-muted">
        <a
          className="text-vscode-info underline-offset-2 hover:underline"
          href="https://github.com/ArianAr/PaperCut"
        >
          GitHub
        </a>
        {" · "}
        GPL-3.0 · privacy-minded by default
      </footer>
    </main>
  );
}
