import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server at `.next/standalone` so the production
  // Docker image ships only the traced runtime files, not the full source
  // tree. See docs/deploy.md.
  output: "standalone",
};

export default nextConfig;
