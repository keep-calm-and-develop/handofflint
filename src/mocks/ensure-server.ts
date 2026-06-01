import { isFigmaApiMockEnabled } from "@/lib/figma/mock-enabled";

const globalForMsw = globalThis as typeof globalThis & {
  __mswListening?: boolean;
};

/**
 * Starts (or re-starts) the Node MSW server.
 * On Turbopack HMR the instrumentation `register()` hook fires again while
 * the previous interceptors may have been invalidated. Closing and
 * re-listening ensures MSW re-patches fetch/http on every cycle.
 */
export async function ensureFigmaMockServer(): Promise<void> {
  if (!isFigmaApiMockEnabled()) return;

  const { figmaMockServer } = await import("@/mocks/server");

  const isRestart = globalForMsw.__mswListening;
  if (isRestart) {
    figmaMockServer.close();
  }

  figmaMockServer.listen({ onUnhandledRequest: "bypass" });
  globalForMsw.__mswListening = true;

  if (!isRestart) {
    console.warn(
      "[handofflint] FIGMA_API_MOCK enabled — Figma REST API mocked via MSW (example.json).",
    );
  }
}
