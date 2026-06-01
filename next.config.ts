import { createRequire } from "node:module";
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "nanoid/non-secure": require.resolve("nanoid/non-secure"),
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "msw/browser": false,
      };
    } else {
      config.resolve.alias = {
        ...config.resolve.alias,
        "msw/node": false,
      };
    }
    return config;
  },
};

export default nextConfig;
