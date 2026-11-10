/**
 * Site-wide settings that are not translatable copy (copy lives in src/i18n/*.json).
 */

/** Cloudflare's always-pass test key. Set PUBLIC_TURNSTILE_SITE_KEY at build time for production. */
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

const turnstileSiteKey = (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined) || TURNSTILE_TEST_SITE_KEY;

// With the test key every real sign-up fails siteverify (403), so a CI or Workers Builds build without
// the real key stops here instead of deploying. ALLOW_TEST_TURNSTILE=1 is for CI checks that never
// deploy; local dev and local e2e (no CI variable) keep the test key. Read at build time only: this
// module is imported by .astro frontmatter, never by browser code.
const buildEnv = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
if (
  turnstileSiteKey === TURNSTILE_TEST_SITE_KEY &&
  [buildEnv.WORKERS_CI, buildEnv.CI].some((v) => !!v && v !== "0" && v !== "false") &&
  buildEnv.ALLOW_TEST_TURNSTILE !== "1"
) {
  throw new Error(
    "PUBLIC_TURNSTILE_SITE_KEY is not set: this CI build would ship Turnstile's test key and every waitlist sign-up would fail. " +
      "Set it as a build variable, or set ALLOW_TEST_TURNSTILE=1 for a build that is never deployed.",
  );
}

export const siteConfig = {
  /** Public Turnstile site key used by the waitlist form on /pricing/. */
  turnstileSiteKey,
  /** Explicit-render Turnstile loader. Must stay allowed by script-src / frame-src of the waitlist pages' CSP in public/_headers. */
  turnstileScriptUrl: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  waitlistEndpoint: "/api/v1/waitlist",
  sourceUrl: "https://github.com/candygoogy/eolietech",
  licenseUrl: "https://www.gnu.org/licenses/agpl-3.0.html",
  /** Header navigation: i18n key + page id (pagePath() in src/i18n/routes.ts builds the URL per locale). */
  nav: [
    { key: "nav.tools", page: "tools" },
    { key: "nav.pricing", page: "pricing" },
    { key: "nav.about", page: "about" },
    { key: "nav.security", page: "security" },
  ],
} as const;
