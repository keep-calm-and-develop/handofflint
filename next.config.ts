import { createRequire } from "node:module";
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "nanoid/non-secure": require.resolve("nanoid/non-secure"),
    },
  },
};

export default nextConfig;
