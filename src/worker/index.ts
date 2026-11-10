import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
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

// public/_headers does not apply to Worker responses, so the API sets its own: JSON only, never
// framed, never cached. HSTS comes from the zone (SSL/TLS settings), not from here.
app.use(
  "/api/*",
  secureHeaders({
    contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    xFrameOptions: "DENY",
    referrerPolicy: "no-referrer",
    crossOriginOpenerPolicy: "same-origin",
    strictTransportSecurity: false,
  }),
);
app.use("/api/*", async (c, next) => {
  await next();
  c.res.headers.set("Cache-Control", "no-store");
});

app.get("/api/health", (c) => c.json({ ok: true }));

// Feature routes live in ./routes/ and are mounted here.
app.route("/api/v1/waitlist", waitlist);

app.all("/api/*", (c) => c.json({ ok: false, error: "not_found" }, 404));

// Only /api/* reaches the Worker (assets.run_worker_first); anything else is served from static assets.
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
