import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { TracesTable } from "@/components/traces/traces-table"
import { TracesFilterSidebar } from "@/components/traces/traces-filter-sidebar"
import { TimeRangePicker } from "@/components/time-range-picker"

const tracesSearchSchema = z.object({
  services: z.array(z.string()).optional(),
  spanNames: z.array(z.string()).optional(),
  hasError: z.boolean().optional(),
  minDurationMs: z.number().optional(),
  maxDurationMs: z.number().optional(),
  httpMethods: z.array(z.string()).optional(),
  httpStatusCodes: z.array(z.string()).optional(),
  deploymentEnvs: z.array(z.string()).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  rootOnly: z.boolean().optional(),
})

export type TracesSearchParams = z.infer<typeof tracesSearchSchema>

export const Route = createFileRoute("/traces/")({
  component: TracesPage,
  validateSearch: (search) => tracesSearchSchema.parse(search),
})

function TracesPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const handleTimeChange = ({ startTime, endTime }: { startTime?: string; endTime?: string }) => {
    navigate({
      search: (prev) => ({ ...prev, startTime, endTime }),
    })
  }

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "Traces" }]}
      title="Traces"
      description="View distributed traces across your services."
      headerActions={
        <TimeRangePicker
          startTime={search.startTime}
          endTime={search.endTime}
          onChange={handleTimeChange}
        />
      }
    >
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <TracesTable filters={search} />
        </div>
        <TracesFilterSidebar />
      </div>
    </DashboardLayout>
  )
}
