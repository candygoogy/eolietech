/**
 * The home's live counter (net-counter.ts) in pure form: which other servers has this page talked
 * to? Input is the browser's own resource timing (navigation + resource entries, whose `name` is the
 * URL requested); output is the distinct origins that are not the page's own. Only network schemes
 * count: data:, blob: and extension-internal URLs are not servers. Nothing is filtered out by host,
 * so a browser extension that injects a request to its own server is counted, as it should be.
 */
const NETWORK = new Set(["http:", "https:", "ws:", "wss:"]);

export function foreignOrigins(entries: Iterable<{ name: string }>, pageOrigin: string): string[] {
  const found = new Set<string>();
  for (const entry of entries) {
    let url: URL;
    try {
      url = new URL(entry.name);
    } catch {
      continue;
    }
    if (!NETWORK.has(url.protocol) || url.origin === pageOrigin) continue;
    found.add(url.origin);
  }
  return [...found].sort();
}
