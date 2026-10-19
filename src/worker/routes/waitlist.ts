import { Hono, type Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Env } from "../index";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "../../tools/types";

/**
 * POST /api/v1/waitlist — Pro waitlist signup.
 *
 * Contract (the site form depends on it):
 *   body  { email: string, turnstileToken: string, locale?: "en" | "it" }, Content-Type: application/json
 *         (locale is the language of the page the form is on; missing or unknown values store "en")
 *   201 {ok:true}                              success, also when already registered (no enumeration)
 *   400 {ok:false,error:"invalid_email"|"bad_request"}
 *   403 {ok:false,error:"turnstile_failed"}    (also "bad_request" for a cross-origin Origin header)
 *   429 {ok:false,error:"rate_limited"}
 *   405 other methods, 500 {ok:false,error:"server_error"}
 *
 * Privacy: only email, UTC day, consent version and page locale are stored. The client IP is used in memory
 * as the rate-limit key and forwarded to Turnstile siteverify, never persisted.
 */

/** Bump when the consent text shown next to the form, or the stored fields, change. */
export const CONSENT_VERSION = "2026-10-v2";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_TIMEOUT_MS = 5000;
/** Turnstile tokens can be up to 2048 chars, so the cap leaves room for one plus a max-length email. */
export const MAX_BODY_BYTES = 4096;
const MAX_EMAIL_LENGTH = 254;
const MAX_TOKEN_LENGTH = 2048;

// WHATWG <input type=email> grammar, but requiring a dot in the domain.
const EMAIL_RE =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

type ErrorCode = "invalid_email" | "bad_request" | "turnstile_failed" | "rate_limited" | "method_not_allowed" | "server_error";

type Ctx = Context<{ Bindings: Env }>;

const reply = (c: Ctx, status: ContentfulStatusCode, body: { ok: true } | { ok: false; error: ErrorCode }) => {
  c.header("Cache-Control", "no-store");
  return c.json(body, status);
};
const fail = (c: Ctx, status: ContentfulStatusCode, error: ErrorCode) => reply(c, status, { ok: false, error });

/** Normalises and validates an email; returns null if unusable. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length === 0 || email.length > MAX_EMAIL_LENGTH) return null;
  const local = email.slice(0, email.indexOf("@"));
  if (local.length > 64) return null;
  return EMAIL_RE.test(email) ? email : null;
}

/** Whitelists the page locale sent by the form; anything else is stored as the default ("en"). */
export function normalizeLocale(raw: unknown): Locale {
  return (LOCALES as readonly unknown[]).includes(raw) ? (raw as Locale) : DEFAULT_LOCALE;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Same-origin guard. Browsers always send Origin on POST; if present it must match the request host.
 * In local dev the Astro dev server (port 4321) proxies /api to wrangler dev (8787), so any
 * localhost origin is accepted when the request itself targets localhost.
 */
function originAllowed(c: Ctx): boolean {
  const origin = c.req.header("Origin");
  if (origin === undefined) return true; // non-browser client; Turnstile still applies
  let o: URL;
  try {
    o = new URL(origin);
  } catch {
    return false; // includes the opaque "null" origin
  }
  const self = new URL(c.req.url);
  if (o.host === self.host) return true;
  return LOCAL_HOSTS.has(o.hostname) && LOCAL_HOSTS.has(self.hostname);
}

async function readBoundedText(req: Request): Promise<string | null> {
  const declared = req.headers.get("Content-Length");
  if (declared !== null && !(Number(declared) <= MAX_BODY_BYTES)) return null;
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buf.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(buf);
  } catch {
    return null;
  }
}

async function verifyTurnstile(secret: string, token: string, ip: string | undefined): Promise<boolean> {
  const form = new URLSearchParams({ secret, response: token });
  if (ip) form.set("remoteip", ip);
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: unknown };
    return data.success === true;
  } catch {
    return false; // network error / timeout / bad JSON: fail closed
  }
}

const waitlist = new Hono<{ Bindings: Env }>();

waitlist.post("/", async (c) => {
  try {
    if (!originAllowed(c)) return fail(c, 403, "bad_request");

    const contentType = c.req.header("Content-Type") ?? "";
    if (contentType.split(";")[0]!.trim().toLowerCase() !== "application/json") return fail(c, 400, "bad_request");

    const text = await readBoundedText(c.req.raw);
    if (text === null) return fail(c, 400, "bad_request");

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return fail(c, 400, "bad_request");
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) return fail(c, 400, "bad_request");
    const { email: rawEmail, turnstileToken, locale: rawLocale } = body as Record<string, unknown>;
    if (typeof rawEmail !== "string") return fail(c, 400, "bad_request");
    if (typeof turnstileToken !== "string" || turnstileToken.length === 0 || turnstileToken.length > MAX_TOKEN_LENGTH) {
      return fail(c, 400, "bad_request");
    }

    const email = normalizeEmail(rawEmail);
    if (email === null) return fail(c, 400, "invalid_email");
    const locale = normalizeLocale(rawLocale);

    const ip = c.req.header("CF-Connecting-IP");
    const { success: underLimit } = await c.env.RL_WAITLIST.limit({ key: ip ?? "unknown" });
    if (!underLimit) return fail(c, 429, "rate_limited");

    if (!c.env.TURNSTILE_SECRET) throw new Error("TURNSTILE_SECRET is not configured");
    if (!(await verifyTurnstile(c.env.TURNSTILE_SECRET, turnstileToken, ip))) return fail(c, 403, "turnstile_failed");

    const day = new Date().toISOString().slice(0, 10);
    await c.env.DB.prepare(
      "INSERT INTO waitlist (email, created_at, consent_version, locale) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(email) DO NOTHING",
    )
      .bind(email, day, CONSENT_VERSION, locale)
      .run();

    return reply(c, 201, { ok: true });
  } catch (err) {
    // Log only the message (never the request body / email).
    console.error("waitlist: unexpected error", err instanceof Error ? err.message : "unknown");
    return fail(c, 500, "server_error");
  }
});

waitlist.all("/", (c) => {
  c.header("Allow", "POST");
  return fail(c, 405, "method_not_allowed");
});

export default waitlist;
