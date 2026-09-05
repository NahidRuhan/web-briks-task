import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.STANDALONE_BUILD === "1" ? "standalone" : undefined,
  /* config options here */
};

export default nextConfig;
