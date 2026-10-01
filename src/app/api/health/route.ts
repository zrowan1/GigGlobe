// GET /api/health — a tiny "I'm alive" check without login.
//
// The iPhone app calls this on the internal address with a short timeout to
// decide whether you are at home (internal address reachable) or outside
// (fall back to the external domain). It deliberately reveals nothing else.

export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response(JSON.stringify({ ok: true, app: "gigglobe" }), {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
