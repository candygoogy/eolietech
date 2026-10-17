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
});
