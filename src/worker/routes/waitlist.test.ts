import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../index";
import { CONSENT_VERSION } from "./waitlist";

const URL_ = "http://example.com/api/v1/waitlist";
const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Each request gets its own client IP so the real local rate limiter (5/min) never trips by accident.
let ipCounter = 0;
const nextIp = () => `203.0.113.${++ipCounter}`;

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(URL_, {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": nextIp(), ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const send = (req: Request) => exports.default.fetch(req);

/** Mocks siteverify: token "pass" succeeds, anything else fails. Other URLs are not expected. */
function mockSiteverify() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== SITEVERIFY) throw new Error(`unexpected fetch ${url}`);
    const form = new URLSearchParams(String(init?.body));
    return Response.json({ success: form.get("response") === "pass" });
  });
}

async function rows() {
  const { results } = await env.DB.prepare("SELECT * FROM waitlist").all<Record<string, string>>();
  return results;
}

beforeEach(async () => {
  await env.DB.exec("DELETE FROM waitlist");
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/v1/waitlist", () => {
  it("valid signup -> 201, stores only email/day/consent version/locale", async () => {
    const fetchSpy = mockSiteverify();
    const res = await send(post({ email: "  Alice@Example.COM ", turnstileToken: "pass", locale: "it" }));
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(await res.json()).toEqual({ ok: true });

    const stored = await rows();
    expect(stored).toHaveLength(1);
    expect(Object.keys(stored[0]!).sort()).toEqual(["consent_version", "created_at", "email", "locale"]);
    expect(stored[0]).toMatchObject({ email: "alice@example.com", consent_version: CONSENT_VERSION, locale: "it" });
    expect(stored[0]!.created_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // siteverify got the secret, the token and the client IP, form-encoded.
    const form = new URLSearchParams(String(fetchSpy.mock.calls[0]![1]?.body));
    expect(form.get("secret")).toBe("1x0000000000000000000000000000000AA");
    expect(form.get("response")).toBe("pass");
    expect(form.get("remoteip")).toMatch(/^203\.0\.113\./);
  });

  it.each([
    ["unknown locale", { locale: "fr" }, "en"],
    ["non-string locale", { locale: ["it"] }, "en"],
    ["missing locale", {}, "en"],
    ["English", { locale: "en" }, "en"],
  ])("%s %j -> 201, stored locale %s", async (_name, extra, expected) => {
    mockSiteverify();
    const res = await send(post({ email: "lia@example.com", turnstileToken: "pass", ...extra }));
    expect(res.status).toBe(201);
    const stored = await rows();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.locale).toBe(expected);
  });

  it("duplicate email -> 201 and still one row", async () => {
    mockSiteverify();
    expect((await send(post({ email: "bob@example.com", turnstileToken: "pass" }))).status).toBe(201);
    const res = await send(post({ email: "BOB@example.com", turnstileToken: "pass" }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ ok: true });
    expect(await rows()).toHaveLength(1);
  });

  it.each(["not-an-email", "a@b", "a b@example.com", `${"x".repeat(250)}@example.com`, ""])(
    "invalid email %j -> 400 invalid_email",
    async (email) => {
      const fetchSpy = mockSiteverify();
      const res = await send(post({ email, turnstileToken: "pass" }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ ok: false, error: "invalid_email" });
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["bad JSON", post("{nope")],
    ["missing token", post({ email: "c@example.com" })],
    ["missing email", post({ turnstileToken: "pass" })],
    ["non-object body", post("[]")],
    ["wrong content type", post({ email: "c@example.com", turnstileToken: "pass" }, { "Content-Type": "text/plain" })],
    ["oversized body", post({ email: "c@example.com", turnstileToken: "x".repeat(5000) })],
  ])("%s -> 400 bad_request", async (_name, req) => {
    mockSiteverify();
    const res = await send(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "bad_request" });
    expect(await rows()).toHaveLength(0);
  });

  it("Turnstile failure -> 403 turnstile_failed, nothing stored", async () => {
    mockSiteverify();
    const res = await send(post({ email: "eve@example.com", turnstileToken: "fail" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, error: "turnstile_failed" });
    expect(await rows()).toHaveLength(0);
  });

  it("siteverify network error -> 403 (fails closed)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("network down"));
    const res = await send(post({ email: "eve@example.com", turnstileToken: "pass" }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, error: "turnstile_failed" });
  });

  it("rate limited -> 429 before Turnstile is called", async () => {
    const fetchSpy = mockSiteverify();
    const limit = vi.fn(async () => ({ success: false }));
    const stubEnv = new Proxy(env, {
      get: (target, key) => (key === "RL_WAITLIST" ? { limit } : Reflect.get(target, key)),
    });
    const req = post({ email: "frank@example.com", turnstileToken: "pass" }, { "CF-Connecting-IP": "198.51.100.7" });
    const res = await app.fetch(req, stubEnv);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ok: false, error: "rate_limited" });
    expect(limit).toHaveBeenCalledWith({ key: "198.51.100.7" });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await rows()).toHaveLength(0);
  });

  it("cross-origin Origin header -> 403; same origin accepted", async () => {
    mockSiteverify();
    const body = { email: "gina@example.com", turnstileToken: "pass" };
    const cross = await send(post(body, { Origin: "https://evil.example" }));
    expect(cross.status).toBe(403);
    expect(await cross.json()).toEqual({ ok: false, error: "bad_request" });
    const same = await send(post(body, { Origin: "http://example.com" }));
    expect(same.status).toBe(201);
  });

  it("D1 failure -> 500 server_error without details", async () => {
    mockSiteverify();
    const stubEnv = new Proxy(env, {
      get: (target, key) =>
        key === "DB" ? { prepare: () => { throw new Error("D1_ERROR: secret detail"); } } : Reflect.get(target, key),
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await app.fetch(post({ email: "hal@example.com", turnstileToken: "pass" }), stubEnv);
    expect(res.status).toBe(500);
    expect(await res.text()).toBe(JSON.stringify({ ok: false, error: "server_error" }));
  });

  it.each(["GET", "PUT", "DELETE", "OPTIONS"])("%s -> 405", async (method) => {
    const res = await send(new Request(URL_, { method }));
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("POST");
  });
});
