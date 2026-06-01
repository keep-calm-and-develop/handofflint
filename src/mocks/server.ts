import { type SetupServer, setupServer } from "msw/node";

import { figmaHandlers } from "@/mocks/figma-handlers";

const globalForMsw = globalThis as typeof globalThis & {
  __mswServer?: SetupServer;
};

/**
 * Singleton MSW server that survives Turbopack hot reloads.
 * Without globalThis, each HMR cycle creates a new instance —
 * the old interceptors are garbage-collected and the new .listen()
 * fails to patch Next.js's custom fetch reliably.
 */
export const figmaMockServer: SetupServer =
  globalForMsw.__mswServer ??
  (() => {
    const server = setupServer(...figmaHandlers);
    globalForMsw.__mswServer = server;
    return server;
  })();
