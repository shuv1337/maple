import { useState, useEffect, useCallback } from "react"
import type { FrameworkId } from "@/components/quick-start/sdk-snippets"

const STORAGE_KEY = "maple-quick-start"

const STEP_IDS = [
  "setup-app",
  "verify-data",
  "select-plan",
  "explore",
] as const

export type StepId = (typeof STEP_IDS)[number]

interface QuickStartState {
  completedSteps: Record<string, boolean>
  dismissed: boolean
  selectedFramework: FrameworkId | null
  activeStep: StepId
}

const DEFAULT_STATE: QuickStartState = {
  completedSteps: {},
  dismissed: false,
  selectedFramework: null,
  activeStep: "setup-app",
}

function readState(): QuickStartState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return { ...DEFAULT_STATE, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore localStorage errors
  }
  return DEFAULT_STATE
}

function writeState(state: QuickStartState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore localStorage errors
  }
}

export function useQuickStart() {
  const [state, setState] = useState<QuickStartState>(DEFAULT_STATE)

  useEffect(() => {
    setState(readState())
  }, [])

  const setActiveStep = useCallback((id: StepId) => {
    setState((prev) => {
      const updated = { ...prev, activeStep: id }
      writeState(updated)
      return updated
    })
  }, [])

  const completeStep = useCallback((id: StepId) => {
    setState((prev) => {
      const updated = {
        ...prev,
        completedSteps: { ...prev.completedSteps, [id]: true },
      }
      
      // Auto-advance to next step if not complete
      const currentIndex = STEP_IDS.indexOf(id)
      if (currentIndex < STEP_IDS.length - 1) {
        updated.activeStep = STEP_IDS[currentIndex + 1]
      }
      
      writeState(updated)
      return updated
    })
  }, [])

  const uncompleteStep = useCallback((id: StepId) => {
    setState((prev) => {
      const { [id]: _, ...rest } = prev.completedSteps
      const updated = { ...prev, completedSteps: rest }
      writeState(updated)
      return updated
    })
  }, [])

  const setSelectedFramework = useCallback(
    (framework: FrameworkId) => {
      setState((prev) => {
        const updated = {
          ...prev,
          selectedFramework: framework,
        }
        writeState(updated)
        return updated
      })
    },
    [],
  )

  const dismiss = useCallback(() => {
    setState((prev) => {
      const updated = { ...prev, dismissed: true }
      writeState(updated)
      return updated
    })
  }, [])

  const undismiss = useCallback(() => {
    setState((prev) => {
      const updated = { ...prev, dismissed: false }
      writeState(updated)
      return updated
    })
  }, [])

  const reset = useCallback(() => {
    const updated = { ...DEFAULT_STATE }
    writeState(updated)
    setState(updated)
  }, [])

  const isStepComplete = useCallback(
    (id: StepId) => !!state.completedSteps[id],
    [state.completedSteps],
  )

  const completedCount = STEP_IDS.filter(
    (id) => state.completedSteps[id],
  ).length
  const totalSteps = STEP_IDS.length
  const progressPercent = Math.round((completedCount / totalSteps) * 100)
  const isDismissed = state.dismissed
  const isComplete = completedCount === totalSteps

  return {
    activeStep: state.activeStep,
    setActiveStep,
    completeStep,
    uncompleteStep,
    dismiss,
    undismiss,
    reset,
    isStepComplete,
    completedCount,
    totalSteps,
    progressPercent,
    isDismissed,
    isComplete,
    selectedFramework: state.selectedFramework,
    setSelectedFramework,
  }
}
