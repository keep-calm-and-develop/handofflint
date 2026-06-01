import { isFigmaApiMockEnabled } from "@/lib/figma/mock-enabled";

let started = false;

/** Starts the Node MSW server once (server-side only — no browser service worker). */
export async function ensureFigmaMockServer(): Promise<void> {
  if (!isFigmaApiMockEnabled() || started) {
    return;
  }

  const { figmaMockServer } = await import("@/mocks/server");

  figmaMockServer.listen({
    onUnhandledRequest: "bypass",
  });

  started = true;
  console.warn(
    "[handofflint] FIGMA_API_MOCK enabled — Figma file fetch API mocked via MSW (example.json). Log appears in this terminal, not the browser.",
  );
}
