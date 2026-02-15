import { useMemo } from "react"
import { formatForTinybird, relativeToAbsolute } from "@/lib/time-utils"

interface TimeRange {
  startTime: string
  endTime: string
}

/**
 * Returns effective time range, applying defaults when not specified.
 * @param defaultRange - shorthand like "12h", "7d" etc. Defaults to "12h".
 */
export function useEffectiveTimeRange(
  startTime?: string,
  endTime?: string,
  defaultRange: string = "12h"
): TimeRange {
  return useMemo(() => {
    if (startTime && endTime) {
      return { startTime, endTime }
    }

    const resolved = relativeToAbsolute(defaultRange)
    if (resolved) {
      return {
        startTime: startTime ?? resolved.startTime,
        endTime: endTime ?? resolved.endTime,
      }
    }

    // Fallback
    const now = new Date()
    const fallback = relativeToAbsolute("12h")!
    return {
      startTime: startTime ?? fallback.startTime,
      endTime: endTime ?? formatForTinybird(now),
    }
  }, [startTime, endTime, defaultRange])
}
