/**
 * Site-wide settings that are not translatable copy (copy lives in src/i18n/*.json).
 */

/** Cloudflare's always-pass test key. Set PUBLIC_TURNSTILE_SITE_KEY at build time for production. */
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export const siteConfig = {
  /** Public Turnstile site key used by the waitlist form on /pricing/. */
  turnstileSiteKey: (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined) || TURNSTILE_TEST_SITE_KEY,
  /** Explicit-render Turnstile loader. Must stay allowed by script-src / frame-src in public/_headers. */
  turnstileScriptUrl: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  waitlistEndpoint: "/api/v1/waitlist",
  sourceUrl: "https://github.com/candygoogy/eolietech",
  licenseUrl: "https://www.gnu.org/licenses/agpl-3.0.html",
  /** Header navigation: i18n key + slug (localePath() builds the URL). */
  nav: [
    { key: "nav.tools", slug: "tools" },
    { key: "nav.pricing", slug: "pricing" },
    { key: "nav.about", slug: "about" },
    { key: "nav.security", slug: "security" },
  ],
} as const;
