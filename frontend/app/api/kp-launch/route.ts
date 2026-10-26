import { isKpEnabled, isKpHomeEnabled } from "@/lib/kp/flags";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** 給 Header 用。讀的是行程環境變數，改 Cloud Run 的 KP_ENABLED 後新 revision 就生效。 */
export function GET() {
  return Response.json(
    { enabled: isKpEnabled(), home: isKpHomeEnabled() },
    { headers: { "cache-control": "no-store" } },
  );
}
