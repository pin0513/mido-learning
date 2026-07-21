import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      // POC: /family-dashboard 直接服務 public 靜態 mockup（家庭儀表板，尚未串接 API）
      { source: "/family-dashboard", destination: "/family-dashboard/index.html" },
    ];
  },
};

export default nextConfig;
