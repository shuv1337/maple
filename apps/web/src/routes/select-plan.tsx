import { useAuth } from "@clerk/clerk-react"
import { useCustomer } from "autumn-js/react"
import { Navigate, createFileRoute } from "@tanstack/react-router"
import { Schema } from "effect"
import {
  ChartLineIcon,
  CircleCheckIcon,
  FileIcon,
  PulseIcon,
  RocketIcon,
} from "@/components/icons"
import { PricingCards } from "@/components/settings/pricing-cards"
import { hasSelectedPlan } from "@/lib/billing/plan-gating"
import { isClerkAuthEnabled } from "@/lib/services/common/auth-mode"

const SelectPlanSearch = Schema.Struct({
  redirect_url: Schema.optional(Schema.String),
})

export const Route = createFileRoute("/select-plan")({
  component: SelectPlanPage,
  validateSearch: Schema.standardSchemaV1(SelectPlanSearch),
})

function resolveRedirectTarget(target: string | undefined): string {
  if (!target) return "/"
  return target.startsWith("/") ? target : "/"
}

function SelectPlanPage() {
  if (!isClerkAuthEnabled) {
    return <Navigate to="/" replace />
  }

  const { isLoaded, isSignedIn, orgId } = useAuth()
  const { customer, isLoading: isCustomerLoading } = useCustomer()
  const { redirect_url } = Route.useSearch()

  if (!isLoaded || isCustomerLoading) {
    return null
  }

  const redirectTarget = resolveRedirectTarget(redirect_url)

  if (!isSignedIn) {
    return <Navigate to="/sign-in" search={{ redirect_url: redirectTarget }} replace />
  }

  if (!orgId) {
    return <Navigate to="/org-required" search={{ redirect_url: redirectTarget }} replace />
  }

  if (hasSelectedPlan(customer)) {
    return <Navigate to={redirectTarget} replace />
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[-8rem] left-[-6rem] h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="absolute right-[-7rem] bottom-[-9rem] h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-8 lg:grid lg:grid-cols-[22rem_1fr] lg:items-start lg:gap-10">
        <aside className="rounded-2xl border bg-card/80 p-6 shadow-sm backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium tracking-wide uppercase">
            <RocketIcon size={14} />
            Getting Started
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Choose a plan to launch Maple
          </h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            To start exploring your telemetry, pick a plan for this workspace.
            You can change plans anytime from settings.
          </p>

          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary mt-0.5 rounded-md p-1.5">
                <CircleCheckIcon size={14} />
              </div>
              <div>
                <p className="text-sm font-medium">Step 1: Select your plan</p>
                <p className="text-muted-foreground text-xs">Starter or Startup based on your expected volume.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 text-primary mt-0.5 rounded-md p-1.5">
                <CircleCheckIcon size={14} />
              </div>
              <div>
                <p className="text-sm font-medium">Step 2: Ingest data</p>
                <p className="text-muted-foreground text-xs">Send logs, traces, and metrics from your services.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg border bg-background/80 p-2.5 text-center">
              <FileIcon className="mx-auto mb-1 text-muted-foreground" size={14} />
              Logs
            </div>
            <div className="rounded-lg border bg-background/80 p-2.5 text-center">
              <PulseIcon className="mx-auto mb-1 text-muted-foreground" size={14} />
              Traces
            </div>
            <div className="rounded-lg border bg-background/80 p-2.5 text-center">
              <ChartLineIcon className="mx-auto mb-1 text-muted-foreground" size={14} />
              Metrics
            </div>
          </div>
        </aside>

        <div className="rounded-2xl border bg-card/85 p-4 shadow-sm backdrop-blur md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Available plans</h2>
              <p className="text-muted-foreground text-xs">
                Billing and limits are managed per workspace.
              </p>
            </div>
          </div>

          <PricingCards />
        </div>
      </section>
    </main>
  )
}
