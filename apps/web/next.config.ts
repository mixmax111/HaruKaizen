import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@harukaizen/shared"],
};

export default nextConfig;
