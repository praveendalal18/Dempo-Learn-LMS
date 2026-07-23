import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // This app lives inside a larger repo that has its own lockfile; pin the
  // root so Next/Turbopack resolves this directory, not the parent repo.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
