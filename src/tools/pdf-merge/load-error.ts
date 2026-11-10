/**
 * Did a dynamic import fail? After a deploy, a tab left open asks for hashed chunks that no longer
 * exist; offline before the first file, the same happens. Each engine words it differently.
 */
export function isChunkLoadError(err: unknown): boolean {
  const text = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return /dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError/i.test(text);
}
