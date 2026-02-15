import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ServicesTable } from "@/components/services/services-table"
import { ServicesFilterSidebar } from "@/components/services/services-filter-sidebar"
import { TimeRangePicker } from "@/components/time-range-picker"

const servicesSearchSchema = z.object({
  environments: z.array(z.string()).optional(),
  commitShas: z.array(z.string()).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
})

export type ServicesSearchParams = z.infer<typeof servicesSearchSchema>

export const Route = createFileRoute("/services/")({
  component: ServicesPage,
  validateSearch: (search) => servicesSearchSchema.parse(search),
})

function ServicesPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const handleTimeChange = ({
    startTime,
    endTime,
  }: {
    startTime?: string
    endTime?: string
  }) => {
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, startTime, endTime }),
    })
  }

  return (
    <DashboardLayout
      breadcrumbs={[{ label: "Services" }]}
      title="Services"
      description="Overview of all services with key metrics."
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
          <ServicesTable filters={search} />
        </div>
        <ServicesFilterSidebar />
      </div>
    </DashboardLayout>
  )
}
