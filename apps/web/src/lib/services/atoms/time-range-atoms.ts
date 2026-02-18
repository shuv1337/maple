import { Atom } from "@effect-atom/atom-react"
import { DateTime, Duration, Effect } from "effect"

interface TimeRange {
  startTime: string
  endTime: string
}

function formatForTinybird(dt: DateTime.Utc): string {
  return DateTime.formatIso(dt).replace("T", " ").slice(0, 19)
}

function shorthandToDuration(shorthand: string): Duration.Duration {
  const match = shorthand.match(/^(\d+)(mo|m|h|d|w)$/)
  if (!match) return Duration.hours(12)

  const n = parseInt(match[1], 10)
  switch (match[2]) {
    case "m":
      return Duration.minutes(n)
    case "h":
      return Duration.hours(n)
    case "d":
      return Duration.days(n)
    case "w":
      return Duration.days(n * 7)
    case "mo":
      return Duration.days(n * 30)
    default:
      return Duration.hours(12)
  }
}

export const effectiveTimeRangeAtom = Atom.family((preset: string) =>
  Atom.make(
    Effect.sync((): TimeRange => {
      const now = DateTime.unsafeNow()

      if (preset === "today") {
        const start = DateTime.startOf(now, "day")
        return {
          startTime: formatForTinybird(start),
          endTime: formatForTinybird(now),
        }
      }

      const dur = shorthandToDuration(preset)
      const start = DateTime.subtractDuration(now, dur)
      return {
        startTime: formatForTinybird(start),
        endTime: formatForTinybird(now),
      }
    }),
  ).pipe((atom) => Atom.setIdleTTL(atom, 60_000)),
)
