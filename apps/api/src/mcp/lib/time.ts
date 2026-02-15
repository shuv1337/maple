import { format, subHours } from "date-fns"

const TINYBIRD_FORMAT = "yyyy-MM-dd HH:mm:ss"

export function defaultTimeRange(hours = 1) {
  const now = new Date()
  return {
    startTime: format(subHours(now, hours), TINYBIRD_FORMAT),
    endTime: format(now, TINYBIRD_FORMAT),
  }
}
