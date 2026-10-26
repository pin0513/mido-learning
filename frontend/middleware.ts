import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * KP_ENABLED 在每次請求讀取，不是 NEXT_PUBLIC_，所以不會在 build 時寫死。
 * Edge middleware 的 process polyfill 會帶入行程的環境變數（見 Next.js sandbox）。
 * 關掉開關後，/kp 全部 404，導覽列也不顯示連結（連結另問 /api/kp-launch）。
 */
export function middleware(request: NextRequest) {
  if (process.env.KP_ENABLED === "true") return NextResponse.next();

  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>找不到頁面</title></head><body style="font-family:sans-serif;padding:2rem;max-width:40rem"><h1>找不到頁面</h1><p>這個網址目前沒有開放。</p><p><a href="/">回首頁</a></p></body></html>`;
  return new NextResponse(html, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
  });
}

export const config = {
  matcher: ["/kp", "/kp/:path*"],
};
