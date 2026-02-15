import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ErrorsSummaryCards } from "@/components/errors/errors-summary-cards"
import { ErrorsByTypeTable } from "@/components/errors/errors-by-type-table"
import { ErrorsFilterSidebar } from "@/components/errors/errors-filter-sidebar"
import { TimeRangePicker } from "@/components/time-range-picker"
import { useEffectiveTimeRange } from "@/hooks/use-effective-time-range"

const errorsSearchSchema = z.object({
  services: z.array(z.string()).optional(),
  deploymentEnvs: z.array(z.string()).optional(),
  errorTypes: z.array(z.string()).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  timePreset: z.string().optional(),
  showSpam: z.boolean().optional(),
})

export type ErrorsSearchParams = z.infer<typeof errorsSearchSchema>

export const Route = createFileRoute("/errors")({
  component: ErrorsPage,
  validateSearch: (search) => errorsSearchSchema.parse(search),
})

function ErrorsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { startTime: effectiveStartTime, endTime: effectiveEndTime } =
    useEffectiveTimeRange(search.startTime, search.endTime)

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

  const apiFilters = {
    startTime: effectiveStartTime,
    endTime: effectiveEndTime,
    services: search.services,
    deploymentEnvs: search.deploymentEnvs,
    errorTypes: search.errorTypes,
    showSpam: search.showSpam,
  }

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "Errors" }]}
      title="Errors"
      description="Monitor and analyze errors across your services."
      headerActions={
        <TimeRangePicker
          startTime={search.startTime}
          endTime={search.endTime}
          presetValue={search.timePreset ?? "12h"}
          onChange={handleTimeChange}
        />
      }
    >
      <div className="space-y-6">
        <ErrorsSummaryCards filters={apiFilters} />

        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold mb-4">Errors by Type</h2>
            <ErrorsByTypeTable filters={apiFilters} />
          </div>
          <ErrorsFilterSidebar />
        </div>
      </div>
    </DashboardLayout>
  )
}
