"use client"

import { RadialBar, RadialBarChart } from "recharts"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import type { BaseChartProps } from "@/components/charts/_shared/chart-types"
import { radialData } from "@/components/charts/_shared/sample-data"

const chartConfig = {
  chrome: { label: "Chrome", color: "hsl(var(--chart-1))" },
  safari: { label: "Safari", color: "hsl(var(--chart-2))" },
  firefox: { label: "Firefox", color: "hsl(var(--chart-3))" },
  edge: { label: "Edge", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig

export function DefaultRadialChart({ data = radialData, className }: BaseChartProps) {
  return (
    <ChartContainer config={chartConfig} className={className}>
      <RadialBarChart
        data={data}
        innerRadius={30}
        outerRadius={110}
      >
        <RadialBar
          dataKey="value"
          cornerRadius={10}
          background
          isAnimationActive={false}
        />
      </RadialBarChart>
    </ChartContainer>
  )
}
