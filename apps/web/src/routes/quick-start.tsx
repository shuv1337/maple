import { useEffect, useState } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Result, useAtomValue } from "@effect-atom/atom-react"
import { useAtomSet } from "@effect-atom/atom-react"
import { Exit } from "effect"
import { toast } from "sonner"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import {
  CheckIcon,
  CopyIcon,
  CircleCheckIcon,
  HouseIcon,
  PulseIcon,
  FileIcon,
  LoaderIcon,
} from "@/components/icons"
import { CodeBlock } from "@/components/quick-start/code-block"
import { sdkSnippets, type FrameworkId } from "@/components/quick-start/sdk-snippets"
import {
  NextjsIcon,
  NodejsIcon,
  PythonIcon,
  GoIcon,
  EffectIcon,
} from "@/components/quick-start/framework-icons"
import { useQuickStart, type StepId } from "@/hooks/use-quick-start"
import { ingestUrl } from "@/lib/services/common/ingest-url"
import { MapleApiAtomClient } from "@/lib/services/common/atom-client"
import { useEffectiveTimeRange } from "@/hooks/use-effective-time-range"
import { getServiceOverviewResultAtom } from "@/lib/services/atoms/tinybird-query-atoms"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/quick-start")({
  component: QuickStartPage,
})

const frameworkIconMap: Record<FrameworkId, React.ComponentType<{ size?: number; className?: string }>> = {
  nextjs: NextjsIcon,
  nodejs: NodejsIcon,
  python: PythonIcon,
  go: GoIcon,
  effect: EffectIcon,
}

function StepIndicator({
  stepNumber,
  isComplete,
}: {
  stepNumber: number
  isComplete: boolean
}) {
  return isComplete ? (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
      <CheckIcon size={14} />
    </span>
  ) : (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium text-muted-foreground">
      {stepNumber}
    </span>
  )
}

function CopyableInput({
  value,
  label,
}: {
  value: string
  label: string
}) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(`${label} copied to clipboard`)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`)
    }
  }

  return (
    <div className="space-y-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <InputGroup>
        <InputGroupInput
          readOnly
          value={value}
          className="font-mono text-xs tracking-wide select-all"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            onClick={handleCopy}
            aria-label={`Copy ${label.toLowerCase()}`}
            title={copied ? "Copied!" : "Copy"}
          >
            {copied ? (
              <CheckIcon size={14} className="text-emerald-500" />
            ) : (
              <CopyIcon size={14} />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function StepCopyCredentials({
  onComplete,
}: {
  onComplete: () => void
}) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const getKeysMutation = useAtomSet(
    MapleApiAtomClient.mutation("ingestKeys", "get"),
    { mode: "promiseExit" },
  )

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      const result = await getKeysMutation({})
      if (cancelled) return

      if (Exit.isSuccess(result)) {
        setApiKey(result.value.publicKey)
      }
      setIsLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [getKeysMutation])

  const displayKey = isLoading ? "Loading..." : (apiKey ?? "Unable to load key")

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        You'll need your ingest endpoint and API key to configure your SDK.
      </p>
      <div className="space-y-3">
        <CopyableInput value={ingestUrl} label="Ingest Endpoint" />
        <CopyableInput value={displayKey} label="API Key (Public)" />
      </div>
      <Button size="sm" variant="outline" onClick={onComplete}>
        I've copied my credentials
      </Button>
    </div>
  )
}

function FrameworkPills({
  selected,
  onSelect,
}: {
  selected: FrameworkId | null
  onSelect: (id: FrameworkId) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">Framework</label>
      <div className="flex flex-wrap gap-2">
        {sdkSnippets.map((snippet) => {
          const Icon = frameworkIconMap[snippet.iconKey]
          const isActive = selected === snippet.language
          return (
            <button
              key={snippet.language}
              type="button"
              onClick={() => onSelect(snippet.language)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "border-foreground/20 bg-muted text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon size={14} />
              {snippet.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StepSetupApp({
  selectedFramework,
  onComplete,
}: {
  selectedFramework: FrameworkId | null
  onComplete: () => void
}) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const getKeysMutation = useAtomSet(
    MapleApiAtomClient.mutation("ingestKeys", "get"),
    { mode: "promiseExit" },
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const result = await getKeysMutation({})
      if (cancelled) return
      if (Exit.isSuccess(result)) {
        setApiKey(result.value.publicKey)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [getKeysMutation])

  function interpolate(template: string) {
    return template
      .replace(/\{\{INGEST_URL\}\}/g, ingestUrl)
      .replace(/\{\{API_KEY\}\}/g, apiKey ?? "<your-api-key>")
  }

  const snippet = sdkSnippets.find((s) => s.language === selectedFramework)

  if (!snippet) {
    return (
      <p className="text-xs text-muted-foreground">
        Pick a framework above to see setup instructions.
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">1. Install dependencies</h4>
        <CodeBlock code={snippet.install} language="shell" />
      </div>
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">2. Add instrumentation</h4>
        <CodeBlock
          code={interpolate(snippet.instrument)}
          language={snippet.label.toLowerCase()}
        />
      </div>
      <Button size="sm" variant="outline" onClick={onComplete}>
        Done — I've set up my app
      </Button>
    </div>
  )
}

function StepVerifyData({
  isComplete,
  onComplete,
}: {
  isComplete: boolean
  onComplete: () => void
}) {
  const [pollCount, setPollCount] = useState(0)
  const { startTime, endTime } = useEffectiveTimeRange(undefined, undefined, "1h")

  useEffect(() => {
    if (isComplete) return

    const interval = setInterval(() => {
      setPollCount((c) => c + 1)
    }, 5000)

    return () => clearInterval(interval)
  }, [isComplete])

  const overviewResult = useAtomValue(
    getServiceOverviewResultAtom({
      data: {
        startTime,
        endTime,
      },
      _poll: pollCount,
    } as any),
  )

  useEffect(() => {
    if (isComplete) return

    if (Result.isSuccess(overviewResult) && overviewResult.value.data.length > 0) {
      onComplete()
    }
  }, [overviewResult, isComplete, onComplete])

  if (isComplete) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-emerald-500">
          <CircleCheckIcon size={16} />
          <span className="text-xs font-medium">Data detected! Your telemetry is flowing.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Run your instrumented application. We'll automatically detect when data arrives.
      </p>
      <div className="flex items-center gap-2 text-muted-foreground">
        <LoaderIcon size={14} className="animate-spin" />
        <span className="text-xs">Waiting for data...</span>
      </div>
      <Button size="sm" variant="ghost" onClick={onComplete}>
        Skip — I'll verify later
      </Button>
    </div>
  )
}

function StepExplore({ onComplete }: { onComplete: () => void }) {
  const links = [
    { title: "Overview", description: "See all your services at a glance", href: "/", icon: HouseIcon },
    { title: "Traces", description: "Explore distributed traces", href: "/traces", icon: PulseIcon },
    { title: "Logs", description: "Search and filter your logs", href: "/logs", icon: FileIcon },
  ]

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Start exploring your observability data.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {links.map((link) => (
          <Link key={link.href} to={link.href} onClick={onComplete}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="p-3">
                <div className="flex items-center gap-2">
                  <link.icon size={14} className="text-muted-foreground" />
                  <CardTitle className="text-xs">{link.title}</CardTitle>
                </div>
                <CardDescription className="text-[11px]">
                  {link.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

const STEPS: {
  id: StepId
  title: string
  description: string
}[] = [
  {
    id: "copy-credentials",
    title: "Copy your credentials",
    description: "Get your ingest endpoint and API key",
  },
  {
    id: "setup-app",
    title: "Set up your app",
    description: "Install the SDK and add instrumentation",
  },
  {
    id: "verify-data",
    title: "Verify data is flowing",
    description: "We'll auto-detect when your first telemetry arrives",
  },
  {
    id: "explore",
    title: "Explore your data",
    description: "Navigate your traces, logs, and metrics",
  },
]

function QuickStartPage() {
  const {
    completeStep,
    isStepComplete,
    completedCount,
    totalSteps,
    progressPercent,
    isDismissed,
    isComplete,
    dismiss,
    undismiss,
    reset,
    selectedFramework,
    setSelectedFramework,
  } = useQuickStart()

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "Quick Start" }]}
      title="Quick Start"
      description="Get your first traces flowing in minutes."
      headerActions={
        <div className="flex items-center gap-2">
          {!isDismissed ? (
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Hide from sidebar
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={undismiss}>
              Show in sidebar
            </Button>
          )}
        </div>
      }
    >
      <div className="max-w-2xl space-y-6">
        {isDismissed && (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            Hidden from sidebar.{" "}
            <button
              type="button"
              onClick={undismiss}
              className="underline underline-offset-2 hover:text-foreground"
            >
              Show again
            </button>
          </div>
        )}

        {isComplete && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="flex items-center gap-3 p-4">
              <CircleCheckIcon size={20} className="shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">You're all set!</p>
                <p className="text-xs text-muted-foreground">
                  All steps completed. Head to the{" "}
                  <Link to="/" className="underline underline-offset-2 hover:text-foreground">
                    Overview
                  </Link>{" "}
                  to see your data.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Progress value={progressPercent}>
          <ProgressLabel>Setup progress</ProgressLabel>
          <ProgressValue>
            {() => `${completedCount} of ${totalSteps} completed`}
          </ProgressValue>
        </Progress>

        <FrameworkPills selected={selectedFramework} onSelect={setSelectedFramework} />

        <Accordion>
          {STEPS.map((step, index) => (
            <AccordionItem key={step.id} value={step.id}>
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <StepIndicator
                    stepNumber={index + 1}
                    isComplete={isStepComplete(step.id)}
                  />
                  <div className="text-left">
                    <div className="text-xs font-medium">{step.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {step.description}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-9">
                {step.id === "copy-credentials" && (
                  <StepCopyCredentials
                    onComplete={() => completeStep("copy-credentials")}
                  />
                )}
                {step.id === "setup-app" && (
                  <StepSetupApp
                    selectedFramework={selectedFramework}
                    onComplete={() => completeStep("setup-app")}
                  />
                )}
                {step.id === "verify-data" && (
                  <StepVerifyData
                    isComplete={isStepComplete("verify-data")}
                    onComplete={() => completeStep("verify-data")}
                  />
                )}
                {step.id === "explore" && (
                  <StepExplore
                    onComplete={() => completeStep("explore")}
                  />
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="pt-2">
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Reset progress
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
