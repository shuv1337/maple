import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { LogsTable } from "@/components/logs/logs-table"
import { LogsFilterSidebar } from "@/components/logs/logs-filter-sidebar"
import { TimeRangePicker } from "@/components/time-range-picker"

const logsSearchSchema = z.object({
  services: z.array(z.string()).optional(),
  severities: z.array(z.string()).optional(),
  search: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timePreset: z.string().optional(),
})

export type LogsSearchParams = z.infer<typeof logsSearchSchema>

export const Route = createFileRoute("/logs")({
  component: LogsPage,
  validateSearch: (search) => logsSearchSchema.parse(search),
})

function LogsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const handleTimeChange = ({
    startTime,
    endTime,
    presetValue,
  }: {
    startTime?: string
    endTime?: string
    presetValue?: string
  }) => {
    navigate({
      search: (prev) => ({ ...prev, startTime, endTime, timePreset: presetValue }),
    })
  }

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "Logs" }]}
      title="Logs"
      description="View and search application logs."
      headerActions={
        <TimeRangePicker
          startTime={search.startTime}
          endTime={search.endTime}
          presetValue={search.timePreset ?? "12h"}
          onChange={handleTimeChange}
        />
      }
    >
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <LogsTable filters={search} />
        </div>
        <LogsFilterSidebar />
      </div>
    </DashboardLayout>
  )
}
