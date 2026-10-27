import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // 學門總圖在請求時才讀 content/。檔案追蹤只會帶走 build 當下有打開的檔，
  // content/home-disciplines.yaml 不會被打開，standalone 就會缺這份清單。
  // 靜態頁不會套用 includes，所以這條只補動態的 /city-home。
  outputFileTracingIncludes: {
    "/city-home": ["./content/**/*"],
  },
  async rewrites() {
    return [
      // POC: /family-kanban 直接服務 public 靜態 mockup（家庭儀表板，尚未串接 API）
      { source: "/family-kanban", destination: "/family-kanban/index.html" },
    ];
  },
};

export default nextConfig;
