"use client"

import { LabelList, Pie, PieChart } from "recharts"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import type { BaseChartProps } from "@/components/charts/_shared/chart-types"
import { pieData } from "@/components/charts/_shared/sample-data"

const chartConfig = {
  chrome: { label: "Chrome", color: "hsl(var(--chart-1))" },
  safari: { label: "Safari", color: "hsl(var(--chart-2))" },
  firefox: { label: "Firefox", color: "hsl(var(--chart-3))" },
  edge: { label: "Edge", color: "hsl(var(--chart-4))" },
  other: { label: "Other", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig

export function RoundedPieChart({ data = pieData, className }: BaseChartProps) {
  return (
    <ChartContainer config={chartConfig} className={className}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          cornerRadius={8}
          paddingAngle={4}
          isAnimationActive={false}
        >
          <LabelList dataKey="value" position="outside" />
        </Pie>
      </PieChart>
    </ChartContainer>
  )
}
