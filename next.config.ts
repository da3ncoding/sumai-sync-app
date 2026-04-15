import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // APIルートへのリクエストボディサイズを1MBに制限（DoS対策）
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
