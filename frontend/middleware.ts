import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * KP_ENABLED 與 KP_HOME_ENABLED 都在每次請求讀取，不是 NEXT_PUBLIC_，所以不會在 build 時寫死。
 * Edge middleware 的 process polyfill 會帶入行程的環境變數。
 * KP_ENABLED 關掉時，/kp 全部 404，導覽列也不顯示連結（連結另問 /api/kp-launch）。
 * KP_HOME_ENABLED 只有在 KP_ENABLED 也是 true 時才算打開。
 * 關掉時，/ 維持靜態首頁，/city-home 404。打開時 / 改寫到 /city-home，網址仍是 /。
 */

function notFound() {
  const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>找不到頁面</title></head><body style="font-family:sans-serif;padding:2rem;max-width:40rem"><h1>找不到頁面</h1><p>這個網址目前沒有開放。</p><p><a href="/">回首頁</a></p></body></html>`;
  return new NextResponse(html, {
    status: 404,
    headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const enabled = process.env.KP_ENABLED === "true";
  const home = enabled && process.env.KP_HOME_ENABLED === "true";
  if (pathname === "/" || pathname === "/city-home") {
    if (!home) return pathname === "/city-home" ? notFound() : NextResponse.next();
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/city-home";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  if (!enabled) return notFound();
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/city-home", "/kp", "/kp/:path*"],
};
