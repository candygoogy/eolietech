/** Replace {name} placeholders. Kept dependency-free so client bundles can import it cheaply. */
export function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (match, k: string) => (k in vars ? String(vars[k]) : match));
}
