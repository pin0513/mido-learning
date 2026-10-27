import { isWishFabEnabled } from "@/lib/kp/flags";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { enabled: isWishFabEnabled() },
    { headers: { "cache-control": "no-store" } },
  );
}
