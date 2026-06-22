import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server build for the Docker image.
  output: "standalone",
  // Avoids misdetecting an unrelated lockfile in a parent directory as the workspace root.
  turbopack: { root: __dirname },
  // node-ical pulls in temporal-polyfill, which crashes ("h.BigInt is not a
  // function") if Turbopack tries to bundle/statically-analyze it. Leaving it
  // external means it's just require()'d normally at runtime instead.
  serverExternalPackages: ["node-ical"],
};

export default nextConfig;
