import type { ConsoleMessage } from "@playwright/test";

/**
 * The one console error the suite tolerates, and only in WebKit: Playwright's WebKit reports a
 * style-src CSP violation (style-src-attr, target: the <select> element) on every page with a native
 * <select>. Nothing on the page sets an inline style; the control renders the same as in Chromium.
 * Not known whether Safari itself does this (audit 2026-11-10, 5.2). Matched exactly: any other
 * CSP message, in any browser, still fails the test.
 */
export const WEBKIT_SELECT_STYLE_CSP =
  "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.";

/** True for a console message a test should fail on: every error, minus the WebKit <select> one above. */
export function isConsoleError(msg: ConsoleMessage): boolean {
  if (msg.type() !== "error") return false;
  const browser = msg.page()?.context().browser()?.browserType().name();
  return !(browser === "webkit" && msg.text() === WEBKIT_SELECT_STYLE_CSP);
}
