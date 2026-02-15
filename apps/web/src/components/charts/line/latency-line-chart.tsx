import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import type { BaseChartProps } from "@/components/charts/_shared/chart-types"
import { latencyTimeSeriesData } from "@/components/charts/_shared/sample-data"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatLatency } from "@/lib/format"

const chartConfig = {
  p99LatencyMs: { label: "P99", color: "var(--chart-1)" },
  p95LatencyMs: { label: "P95", color: "var(--chart-2)" },
  p50LatencyMs: { label: "P50", color: "var(--chart-3)" },
} satisfies ChartConfig

function formatBucketTime(value: string) {
  const date = new Date(value)
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

export function LatencyLineChart({ data, className, legend, tooltip }: BaseChartProps) {
  return (
    <ChartContainer config={chartConfig} className={className}>
      <LineChart data={data ?? latencyTimeSeriesData} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={formatBucketTime}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(v) => formatLatency(v)}
        />
        {tooltip !== "hidden" && (
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  if (!payload?.[0]?.payload?.bucket) return ""
                  return new Date(payload[0].payload.bucket).toLocaleString()
                }}
                formatter={(value, name) => {
                  const config = chartConfig[name as keyof typeof chartConfig]
                  return (
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground">{config?.label ?? name}</span>
                      <span className="font-mono font-medium">{formatLatency(value as number)}</span>
                    </span>
                  )
                }}
              />
            }
          />
        )}
        {legend === "visible" && <ChartLegend content={<ChartLegendContent />} />}
        <Line type="monotone" dataKey="p99LatencyMs" stroke="var(--color-p99LatencyMs)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="p95LatencyMs" stroke="var(--color-p95LatencyMs)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="p50LatencyMs" stroke="var(--color-p50LatencyMs)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ChartContainer>
  )
}
