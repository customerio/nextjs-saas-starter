import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // customerio-node is a Node.js library. Keep it out of the bundler so it
  // only ever runs on the server.
  serverExternalPackages: ["customerio-node"],
  poweredByHeader: false,
};

export default nextConfig;
