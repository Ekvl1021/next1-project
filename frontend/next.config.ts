import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Keep performance runs separate from the development build.
  distDir: process.env.LAB_DIST_DIR || ".next",
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: path.resolve(__dirname, ".."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
