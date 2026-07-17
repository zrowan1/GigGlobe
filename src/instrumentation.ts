// Runs once when the Next.js server boots (the `register` hook, which Next runs
// in production too, including the standalone image).
//
// The actual database work lives in ./instrumentation-node because it pulls in
// `pg` (Node-only). Importing it strictly inside the NEXT_RUNTIME === "nodejs"
// guard lets Next keep it out of the Edge bundle — the middleware runs on the
// Edge runtime, where `pg`/`fs` don't exist.
//
// Opt out with AUTO_MIGRATE=false if you'd rather run migrations by hand.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.AUTO_MIGRATE !== "false") {
      const { setup } = await import("./instrumentation-node");
      await setup();
    }
  }
}
