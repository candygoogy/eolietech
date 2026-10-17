import { Hono } from "hono";
import waitlist from "./routes/waitlist";

/** Worker bindings (see wrangler.jsonc). TURNSTILE_SECRET is a secret (.dev.vars locally). */
export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  RL_WAITLIST: RateLimit;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true }));

// Feature routes live in ./routes/ and are mounted here.
app.route("/api/v1/waitlist", waitlist);

app.all("/api/*", (c) => c.json({ ok: false, error: "not_found" }, 404));

// Only /api/* reaches the Worker (assets.run_worker_first); anything else is served from static assets.
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
