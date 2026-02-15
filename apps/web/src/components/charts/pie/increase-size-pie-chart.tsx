"use client"

import { Cell, Pie, PieChart } from "recharts"
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

export function IncreaseSizePieChart({ data = pieData, className }: BaseChartProps) {
  const sorted = [...data].sort(
    (a, b) => (b as { value: number }).value - (a as { value: number }).value
  )

  const baseOuterRadius = 60
  const radiusStep = 15

  return (
    <ChartContainer config={chartConfig} className={className}>
      <PieChart>
        {sorted.map((entry, index) => (
          <Pie
            key={index}
            data={[entry]}
            dataKey="value"
            nameKey="name"
            innerRadius={0}
            outerRadius={baseOuterRadius + index * radiusStep}
            isAnimationActive={false}
          >
            <Cell fill={(entry as { fill: string }).fill} />
          </Pie>
        ))}
      </PieChart>
    </ChartContainer>
  )
}
