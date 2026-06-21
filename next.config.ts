import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal, self-contained server build for the Docker image.
  output: "standalone",
  // Avoids misdetecting an unrelated lockfile in a parent directory as the workspace root.
  turbopack: { root: __dirname },
};

export default nextConfig;
