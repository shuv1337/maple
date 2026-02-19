import { Atom } from "@effect-atom/atom-react"
import { Schema } from "effect"
import { localStorageRuntime } from "@/lib/services/common/storage-runtime"

export const STEP_IDS = [
  "setup-app",
  "verify-data",
  "select-plan",
  "explore",
] as const

export type StepId = (typeof STEP_IDS)[number]

const QuickStartSchema = Schema.Struct({
  completedSteps: Schema.Record({ key: Schema.String, value: Schema.Boolean }),
  dismissed: Schema.Boolean,
  selectedFramework: Schema.NullOr(Schema.String),
  activeStep: Schema.String,
})

export type QuickStartState = typeof QuickStartSchema.Type

const DEFAULT_STATE: QuickStartState = {
  completedSteps: {},
  dismissed: false,
  selectedFramework: null,
  activeStep: "setup-app",
}

export const quickStartAtomFamily = Atom.family((orgId: string) =>
  Atom.kvs({
    runtime: localStorageRuntime,
    key: `maple-quick-start-${orgId}`,
    schema: QuickStartSchema,
    defaultValue: () => DEFAULT_STATE,
  }),
)
