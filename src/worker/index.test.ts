import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const req = (path: string, init?: RequestInit) => exports.default.fetch(new Request(`http://example.com${path}`, init));

describe("worker", () => {
  it("GET /api/health returns ok", async () => {
    const res = await req("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("unknown /api/* returns a JSON 404", async () => {
    const res = await req("/api/x");
    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toMatchObject({ ok: false, error: "not_found" });
  });

  it.each(["/api/health", "/api/x"])("%s carries the API security headers and is never cached", async (path) => {
    const res = await req(path);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("cross-origin-opener-policy")).toBe("same-origin");
    expect(res.headers.get("content-security-policy")).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(res.headers.get("strict-transport-security")).toBeNull();
  });

  it("sends the same headers on a waitlist error response", async () => {
    const res = await req("/api/v1/waitlist", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("content-security-policy")).toBe("default-src 'none'; frame-ancestors 'none'");
  });
});
