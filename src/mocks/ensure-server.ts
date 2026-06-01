import { isFigmaApiMockEnabled } from "@/lib/figma/mock-enabled";

const globalForMsw = globalThis as typeof globalThis & {
  __mswListening?: boolean;
};

/** Starts the Node MSW server once (server-side only — no browser service worker). */
export async function ensureFigmaMockServer(): Promise<void> {
  if (!isFigmaApiMockEnabled() || globalForMsw.__mswListening) {
    return;
  }

  const { figmaMockServer } = await import("@/mocks/server");

  figmaMockServer.listen({ onUnhandledRequest: "bypass" });
  globalForMsw.__mswListening = true;

  console.warn(
    "[handofflint] FIGMA_API_MOCK enabled — Figma REST API mocked via MSW (example.json).",
  );
}
