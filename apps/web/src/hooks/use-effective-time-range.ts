import { Result, useAtomValue } from "@effect-atom/atom-react"
import { useMemo } from "react"
import { effectiveTimeRangeAtom } from "@/lib/services/atoms/time-range-atoms"
import { formatForTinybird, relativeToAbsolute } from "@/lib/time-utils"

interface TimeRange {
  startTime: string
  endTime: string
}

/**
 * Returns effective time range, applying defaults when not specified.
 *
 * When no explicit startTime/endTime are provided, the range is computed
 * via an effect atom with a 60s idle TTL. This stabilizes the atom family
 * key across route navigations so cached data is shown instantly instead
 * of a loading skeleton.
 *
 * @param defaultRange - shorthand like "12h", "7d" etc. Defaults to "12h".
 */
export function useEffectiveTimeRange(
  startTime?: string,
  endTime?: string,
  defaultRange: string = "12h",
): TimeRange {
  const rangeResult = useAtomValue(effectiveTimeRangeAtom(defaultRange))

  return useMemo(() => {
    if (startTime && endTime) {
      return { startTime, endTime }
    }

    if (Result.isSuccess(rangeResult)) {
      return rangeResult.value
    }

    // Fallback for unlikely Initial state (Effect.sync should resolve immediately)
    const resolved = relativeToAbsolute(defaultRange)
    if (resolved) {
      return {
        startTime: startTime ?? resolved.startTime,
        endTime: endTime ?? resolved.endTime,
      }
    }

    const now = new Date()
    const fallback = relativeToAbsolute("12h")!
    return {
      startTime: startTime ?? fallback.startTime,
      endTime: endTime ?? formatForTinybird(now),
    }
  }, [startTime, endTime, defaultRange, rangeResult])
}
