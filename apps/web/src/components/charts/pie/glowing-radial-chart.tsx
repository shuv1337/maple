"use client"

import { useId, useState } from "react"
import { RadialBar, RadialBarChart } from "recharts"
import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import type { BaseChartProps } from "@/components/charts/_shared/chart-types"
import { radialData } from "@/components/charts/_shared/sample-data"
import { GlowFilter } from "@/components/charts/_shared/svg-filters"

const chartConfig = {
  chrome: { label: "Chrome", color: "hsl(var(--chart-1))" },
  safari: { label: "Safari", color: "hsl(var(--chart-2))" },
  firefox: { label: "Firefox", color: "hsl(var(--chart-3))" },
  edge: { label: "Edge", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig

export function GlowingRadialChart({ data = radialData, className }: BaseChartProps) {
  const id = useId()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const glowFilterIds = data.map((_, i) => `radial-glow-${i}-${id}`)

  return (
    <ChartContainer config={chartConfig} className={className}>
      <RadialBarChart
        data={data}
        innerRadius={30}
        outerRadius={110}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          {glowFilterIds.map((filterId) => (
            <GlowFilter key={filterId} id={filterId} stdDeviation={4} />
          ))}
        </defs>
        <RadialBar
          dataKey="value"
          cornerRadius={10}
          background
          isAnimationActive={false}
          onMouseEnter={(_, index) => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={
            hoveredIndex !== null
              ? { filter: `url(#${glowFilterIds[hoveredIndex]})` }
              : undefined
          }
        />
      </RadialBarChart>
    </ChartContainer>
  )
}
