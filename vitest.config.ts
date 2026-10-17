import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // Worker tests run inside workerd with the real bindings from wrangler.jsonc.
        plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
        test: {
          name: "worker",
          include: ["src/worker/**/*.test.ts"],
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
