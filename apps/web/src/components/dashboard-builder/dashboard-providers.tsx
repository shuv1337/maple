import {
  createContext,
  use,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"
import type { TimeRange } from "@/components/dashboard-builder/types"

// ---------------------------------------------------------------------------
// Time Range Context
// ---------------------------------------------------------------------------

interface DashboardTimeRangeContextValue {
  state: {
    timeRange: TimeRange
  }
  actions: {
    setTimeRange: (timeRange: TimeRange) => void
  }
  meta: {}
}

const DashboardTimeRangeContext = createContext<DashboardTimeRangeContextValue | null>(null)

export function useDashboardTimeRange() {
  const context = use(DashboardTimeRangeContext)
  if (!context) {
    throw new Error(
      "useDashboardTimeRange must be used within DashboardTimeRangeProvider."
    )
  }
  return context
}

interface DashboardTimeRangeProviderProps {
  initialTimeRange: TimeRange
  onTimeRangeChange?: (timeRange: TimeRange) => void
  children: ReactNode
}

export function DashboardTimeRangeProvider({
  initialTimeRange,
  onTimeRangeChange,
  children,
}: DashboardTimeRangeProviderProps) {
  const [timeRange, setTimeRangeState] = useState<TimeRange>(initialTimeRange)

  const setTimeRange = useCallback(
    (tr: TimeRange) => {
      setTimeRangeState(tr)
      onTimeRangeChange?.(tr)
    },
    [onTimeRangeChange]
  )

  const value = useMemo<DashboardTimeRangeContextValue>(
    () => ({
      state: { timeRange },
      actions: { setTimeRange },
      meta: {},
    }),
    [timeRange, setTimeRange]
  )

  return (
    <DashboardTimeRangeContext.Provider value={value}>
      {children}
    </DashboardTimeRangeContext.Provider>
  )
}
