// GET /api/v1/stats — the headline counters (map) and the full statistics
// (stats page) in one go.

import { getRequestUserId } from "@/lib/api/auth";
import { json, unauthorized } from "@/lib/api/http";
import { getDetailedStats, getGigStats } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const userId = await getRequestUserId(request);
  if (!userId) return unauthorized();

  const [summary, detailed] = await Promise.all([
    getGigStats(userId),
    getDetailedStats(userId),
  ]);
  return json({ summary, detailed });
}
