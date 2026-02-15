import { useId } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import type { BaseChartProps } from "@/components/charts/_shared/chart-types"
import { apdexTimeSeriesData } from "@/components/charts/_shared/sample-data"
import { VerticalGradient } from "@/components/charts/_shared/svg-patterns"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  apdexScore: { label: "Apdex", color: "var(--chart-5)" },
} satisfies ChartConfig

function formatBucketTime(value: string) {
  const date = new Date(value)
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

export function ApdexAreaChart({ data, className, legend, tooltip }: BaseChartProps) {
  const id = useId()
  const gradientId = `apdexGradient-${id.replace(/:/g, "")}`

  return (
    <ChartContainer config={chartConfig} className={className}>
      <AreaChart data={data ?? apdexTimeSeriesData} accessibilityLayer>
        <defs>
          <VerticalGradient id={gradientId} color="var(--color-apdexScore)" />
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={formatBucketTime}
        />
        <YAxis domain={[0, 1]} tickLine={false} axisLine={false} tickMargin={8} />
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
                    <span className="text-muted-foreground">Apdex</span>
                    <span className="font-mono font-medium">{Number(value).toFixed(2)}</span>
                  </span>
                )}
              />
            }
          />
        )}
        {legend === "visible" && <ChartLegend content={<ChartLegendContent />} />}
        <Area
          type="monotone"
          dataKey="apdexScore"
          stroke="var(--color-apdexScore)"
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  )
}
