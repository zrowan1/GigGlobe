// Auth.js HTTP endpoints (login, logout, session, etc.) live under
// /api/auth/*. They are generated from the config in src/lib/auth.ts.
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
