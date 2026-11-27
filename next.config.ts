import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep performance runs separate from the development build.
  distDir: process.env.LAB_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
