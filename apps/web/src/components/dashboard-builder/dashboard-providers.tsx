import {
  createContext,
  use,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react"
import type { TimeRange, DashboardVariable } from "@/components/dashboard-builder/types"

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

// ---------------------------------------------------------------------------
// Variables Context
// ---------------------------------------------------------------------------

interface DashboardVariablesContextValue {
  state: {
    definitions: DashboardVariable[]
    values: Map<string, string | string[]>
  }
  actions: {
    setVariable: (id: string, value: string | string[]) => void
  }
  meta: {}
}

const DashboardVariablesContext = createContext<DashboardVariablesContextValue | null>(null)

export function useDashboardVariables() {
  const context = use(DashboardVariablesContext)
  if (!context) {
    throw new Error(
      "useDashboardVariables must be used within DashboardVariablesProvider."
    )
  }
  return context
}

interface DashboardVariablesProviderProps {
  variables: DashboardVariable[]
  onVariablesChange?: (values: Map<string, string | string[]>) => void
  children: ReactNode
}

export function DashboardVariablesProvider({
  variables,
  onVariablesChange,
  children,
}: DashboardVariablesProviderProps) {
  const [values, setValues] = useState<Map<string, string | string[]>>(() => {
    const initial = new Map<string, string | string[]>()
    for (const v of variables) {
      if (v.defaultValue !== undefined) {
        initial.set(v.id, v.defaultValue)
      }
    }
    return initial
  })

  const setVariable = useCallback(
    (id: string, value: string | string[]) => {
      setValues((prev) => {
        const next = new Map(prev)
        next.set(id, value)
        onVariablesChange?.(next)
        return next
      })
    },
    [onVariablesChange]
  )

  const contextValue = useMemo<DashboardVariablesContextValue>(
    () => ({
      state: {
        definitions: variables,
        values,
      },
      actions: {
        setVariable,
      },
      meta: {},
    }),
    [variables, values, setVariable]
  )

  return (
    <DashboardVariablesContext.Provider value={contextValue}>
      {children}
    </DashboardVariablesContext.Provider>
  )
}
