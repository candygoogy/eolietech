import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // Worker tests run inside workerd with the real bindings from wrangler.jsonc, plus the D1
        // migrations (applied by the setup file) and the always-pass Turnstile test secret.
        plugins: [
          cloudflareTest(async () => ({
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              bindings: {
                TEST_MIGRATIONS: await readD1Migrations("./migrations"),
                TURNSTILE_SECRET: "1x0000000000000000000000000000000AA",
              },
            },
          })),
        ],
        test: {
          name: "worker",
          include: ["src/worker/**/*.test.ts"],
          setupFiles: ["./src/worker/test/apply-migrations.ts"],
        },
      },
      {
        // Registry contract test + client tool logic.
        test: {
          name: "unit",
          environment: "happy-dom",
          include: ["src/**/*.test.ts"],
          exclude: ["**/node_modules/**", "src/worker/**"],
        },
      },
    ],
  },
});
