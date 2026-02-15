import { useId } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import type { BaseChartProps } from "@/components/charts/_shared/chart-types"
import { errorRateTimeSeriesData } from "@/components/charts/_shared/sample-data"
import { VerticalGradient } from "@/components/charts/_shared/svg-patterns"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { formatErrorRate } from "@/lib/format"

const chartConfig = {
  errorRate: { label: "Error Rate", color: "var(--color-destructive, #ef4444)" },
} satisfies ChartConfig

function formatBucketTime(value: string) {
  const date = new Date(value)
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

export function ErrorRateAreaChart({ data, className, legend, tooltip }: BaseChartProps) {
  const id = useId()
  const gradientId = `errorRateGradient-${id.replace(/:/g, "")}`

  return (
    <ChartContainer config={chartConfig} className={className}>
      <AreaChart data={data ?? errorRateTimeSeriesData} accessibilityLayer>
        <defs>
          <VerticalGradient id={gradientId} color="var(--color-errorRate)" />
        </defs>
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
          tickFormatter={(v) => formatErrorRate(v)}
        />
        {tooltip !== "hidden" && (
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  if (!payload?.[0]?.payload?.bucket) return ""
                  return new Date(payload[0].payload.bucket).toLocaleString()
                }}
                formatter={(value) => (
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground">Error Rate</span>
                    <span className="font-mono font-medium">{formatErrorRate(value as number)}</span>
                  </span>
                )}
              />
            }
          />
        )}
        {legend === "visible" && <ChartLegend content={<ChartLegendContent />} />}
        <Area
          type="monotone"
          dataKey="errorRate"
          stroke="var(--color-errorRate)"
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
