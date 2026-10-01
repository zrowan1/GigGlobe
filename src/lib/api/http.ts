// Small helpers for the JSON API routes (src/app/api/v1, src/app/api/mobile).

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      // API answers are per-user; never let a proxy or the app cache them.
      "cache-control": "no-store",
    },
  });
}

export function apiError(message: string, status: number): Response {
  return json({ error: message }, status);
}

export const unauthorized = () => apiError("Niet ingelogd.", 401);
export const notFound = () => apiError("Niet gevonden.", 404);

// Ids in URLs come straight from the client. Postgres throws on a malformed
// uuid, so reject those up front and answer 404 like any unknown id.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value);
}

// Parse a JSON request body into a plain object, or null when it isn't one.
export async function readJsonObject(
  request: Request
): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  return null;
}
