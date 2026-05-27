export function ScanHeader() {
  return (
    <header className="mb-10">
      <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        Design handoff QA
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        HandOffLint
      </h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
        Paste a Figma URL to get a Readiness Score and severity-sorted lint
        findings before marking designs ready for dev.
      </p>
    </header>
  );
}
