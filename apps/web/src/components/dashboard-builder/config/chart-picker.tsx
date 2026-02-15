import { useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { getChartById } from "@/components/charts/registry"
import { ChartPreview } from "@/components/dashboard-builder/widgets/chart-preview"
import type {
  VisualizationType,
  WidgetDataSource,
  WidgetDisplayConfig,
} from "@/components/dashboard-builder/types"
import {
  statPresets,
  tablePresets,
  type WidgetPresetDefinition,
} from "@/components/dashboard-builder/widgets/widget-definitions"
import { createQueryDraft } from "@/lib/query-builder/model"

type ChartCategory = "bar" | "area" | "line" | "pie" | "radar"

const categoryDefaults: Array<{
  category: ChartCategory
  chartId: string
  label: string
}> = [
  { category: "bar", chartId: "default-bar", label: "Bar Chart" },
  { category: "area", chartId: "gradient-area", label: "Area Chart" },
  { category: "line", chartId: "dotted-line", label: "Line Chart" },
  { category: "pie", chartId: "rounded-pie", label: "Pie Chart" },
  { category: "radar", chartId: "stroke-radar", label: "Radar Chart" },
]

type PickerTab = "charts" | "stats" | "tables"

const tabs: { id: PickerTab; label: string }[] = [
  { id: "charts", label: "Charts" },
  { id: "stats", label: "Stats" },
  { id: "tables", label: "Tables" },
]

interface WidgetPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (
    visualization: VisualizationType,
    dataSource: WidgetDataSource,
    display: WidgetDisplayConfig
  ) => void
}

export function WidgetPicker({ open, onOpenChange, onSelect }: WidgetPickerProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>("charts")

  const handleSelectChart = (chartId: string) => {
    void chartId
    onSelect(
      "chart",
      {
        endpoint: "custom_query_builder_timeseries",
        params: {
          queries: [createQueryDraft(0)],
          formulas: [],
          comparison: {
            mode: "none",
            includePercentChange: true,
          },
          debug: false,
        },
      },
      { chartId: "query-builder-line" }
    )
    onOpenChange(false)
  }

  const handleSelectPreset = (preset: WidgetPresetDefinition) => {
    onSelect(preset.visualization, preset.dataSource, preset.display)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Widget</DialogTitle>
          <DialogDescription>
            Choose a widget type to add to your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 mb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "ring-2 ring-foreground bg-foreground text-background"
                  : "ring-1 ring-border hover:ring-foreground/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "charts" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categoryDefaults.map(({ chartId, label }) => {
              const entry = getChartById(chartId)
              if (!entry) return null
              const Component = entry.component

              return (
                <button
                  key={chartId}
                  type="button"
                  onClick={() => handleSelectChart(chartId)}
                  className="group ring-1 ring-border hover:ring-foreground/30 bg-card p-3 text-left transition-all flex flex-col gap-2"
                >
                  <ChartPreview component={Component} />
                  <div className="text-xs font-medium">{label}</div>
                </button>
              )
            })}
          </div>
        )}

        {activeTab === "stats" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="group ring-1 ring-border hover:ring-foreground/30 bg-card p-4 text-left transition-all flex flex-col items-center gap-2"
              >
                {preset.icon && (
                  <preset.icon
                    size={24}
                    className="text-muted-foreground group-hover:text-foreground transition-colors"
                  />
                )}
                <div className="text-xs font-medium text-center">{preset.name}</div>
                <div className="text-[10px] text-muted-foreground text-center">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === "tables" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tablePresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="group ring-1 ring-border hover:ring-foreground/30 bg-card p-4 text-left transition-all flex flex-col gap-2"
              >
                <div className="text-xs font-medium">{preset.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {preset.description}
                </div>
                {preset.display.columns && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {preset.display.columns.map((col) => (
                      <span
                        key={col.field}
                        className="text-[9px] px-1.5 py-0.5 ring-1 ring-border text-muted-foreground"
                      >
                        {col.header}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
