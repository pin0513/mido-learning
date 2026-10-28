import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canonicalLanguageBranch } from "@/lib/kp/home-state";

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
  const softSkills = enabled && process.env.KP_SOFTSKILLS_ENABLED === "true";
  const yuwen = enabled && process.env.KP_YUWEN_ENABLED === "true";
  if (pathname === "/" || pathname === "/city-home") {
    if (!home) return pathname === "/city-home" ? notFound() : NextResponse.next();
    const branch = request.nextUrl.searchParams.get("b");
    const canonical = request.nextUrl.searchParams.get("d") === "language" ? canonicalLanguageBranch(branch) : null;
    if (yuwen && canonical && canonical !== branch) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("b", canonical);
      return NextResponse.redirect(url, 308);
    }
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/city-home";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // /kp-v2 不是公開網址。KP 開或關、詳細頁旗標開或關，直連都是 404。
  // rewrite 不會再跑一次 middleware，所以從 /kp/概念/學段 改寫進來的請求不會被這行擋下。
  if (pathname === "/kp-v2" || pathname.startsWith("/kp-v2/")) return notFound();
  if (!enabled) return notFound();
  if (!softSkills && isSoftSkillsPath(pathname)) return notFound();
  if (!yuwen && isLanguagePath(pathname)) return notFound();
  const detailV2 = enabled && process.env.KP_DETAIL_V2_ENABLED === "true";
  const detail = /^\/kp\/([a-z]{2,8}\.[a-z0-9]+)\/([a-z]{2,8})\/?$/.exec(pathname);
  if (detailV2 && detail) {
    const url = request.nextUrl.clone();
    url.pathname = `/kp-v2/${detail[1]}/${detail[2]}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

function isSoftSkillsPath(pathname: string): boolean {
  return pathname === "/kp/discipline/soft-skills"
    || pathname.startsWith("/kp/path/sk.")
    || pathname.startsWith("/kp/sk.")
    || pathname.startsWith("/kp/sk/");
}

function isLanguagePath(pathname: string): boolean {
  return pathname === "/kp/discipline/language"
    || pathname.startsWith("/kp/path/zh.")
    || pathname.startsWith("/kp/path/en.")
    || pathname.startsWith("/kp/path/ja.")
    || pathname.startsWith("/kp/path/lg.")
    || pathname.startsWith("/kp/zh.")
    || pathname.startsWith("/kp/zh/")
    || pathname.startsWith("/kp/en.")
    || pathname.startsWith("/kp/en/")
    || pathname.startsWith("/kp/ja.")
    || pathname.startsWith("/kp/ja/")
    || pathname.startsWith("/kp/lg.")
    || pathname.startsWith("/kp/lg/");
}

export const config = {
  matcher: ["/", "/city-home", "/kp", "/kp/:path*", "/kp-v2", "/kp-v2/:path*"],
};
