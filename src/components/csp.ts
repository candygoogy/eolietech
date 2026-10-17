/**
 * The site-wide Content-Security-Policy, read from public/_headers at build time so the pages that
 * quote it (/security/, the home page) can never drift from what is actually served.
 */
import headers from "../../public/_headers?raw";

export const CONTENT_SECURITY_POLICY: string =
  /^\s*Content-Security-Policy:\s*(.+?)\s*$/im.exec(headers)?.[1] ?? "";

/** The policy split into directives, e.g. ["default-src 'self'", "connect-src 'self'", ...]. */
export const CSP_DIRECTIVES: string[] = CONTENT_SECURITY_POLICY.split(";")
  .map((d) => d.trim())
  .filter(Boolean);

/** One directive by name, e.g. directive("connect-src") -> "connect-src 'self'". */
export const directive = (name: string): string => CSP_DIRECTIVES.find((d) => d.startsWith(`${name} `)) ?? "";
