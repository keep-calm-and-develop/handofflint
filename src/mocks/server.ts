import { setupServer } from "msw/node";

import { figmaHandlers } from "@/mocks/figma-handlers";

export const figmaMockServer = setupServer(...figmaHandlers);
