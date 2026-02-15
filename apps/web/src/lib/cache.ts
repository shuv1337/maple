export interface CacheInfo {
  system: string | null
  name: string | null
  operation: string | null
  lookupPerformed: boolean
  result: "hit" | "miss" | null
}

export function getCacheInfo(attrs: Record<string, string>): CacheInfo | null {
  const system = attrs["cache.system"]
  const result = attrs["cache.result"]

  // Detect cache span if any cache.* attribute is present
  if (!system && !result) return null

  return {
    system: system ?? null,
    name: attrs["cache.name"] ?? null,
    operation: attrs["cache.operation"] ?? null,
    lookupPerformed: attrs["cache.lookup_performed"] === "true",
    result: result === "hit" || result === "miss" ? result : null,
  }
}

export const cacheResultStyles = {
  hit: "bg-amber-500/20 text-amber-700 dark:bg-amber-400/20 dark:text-amber-400 border-amber-500/30",
  miss: "bg-sky-500/20 text-sky-700 dark:bg-sky-400/20 dark:text-sky-400 border-sky-500/30",
}

export const CACHE_OPERATION_COLORS: Record<string, string> = {
  GET: "bg-amber-500",
  SET: "bg-blue-500",
  DELETE: "bg-red-500",
}
