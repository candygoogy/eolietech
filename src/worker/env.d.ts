// Ties the Worker's own types into the Cloudflare runtime types (`env` from "cloudflare:workers",
// and `exports.default` in tests). Equivalent to what `wrangler types` would generate.
declare namespace Cloudflare {
  type WorkerEnv = import("./index").Env;
  interface Env extends WorkerEnv {}
  interface GlobalProps {
    mainModule: typeof import("./index");
  }
}
