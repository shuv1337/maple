import { z } from "zod";
import { getTinybird } from "@/lib/tinybird";

export interface ServiceUsage {
  serviceName: string;
  totalLogs: number;
  totalTraces: number;
  totalMetrics: number;
  dataSizeBytes: number;
  logSizeBytes: number;
  traceSizeBytes: number;
  metricSizeBytes: number;
}

export interface ServiceUsageResponse {
  data: ServiceUsage[];
  error: string | null;
}

const dateTimeString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, "Invalid datetime format");

const GetServiceUsageInput = z.object({
  service: z.string().optional(),
  startTime: dateTimeString.optional(),
  endTime: dateTimeString.optional(),
});

export type GetServiceUsageInput = z.infer<typeof GetServiceUsageInput>;

export async function getServiceUsage({
  data,
}: {
  data: GetServiceUsageInput
}): Promise<ServiceUsageResponse> {
  data = GetServiceUsageInput.parse(data ?? {})

  try {
    const tinybird = getTinybird();
    const result = await tinybird.query.get_service_usage({
      service: data.service,
      start_time: data.startTime,
      end_time: data.endTime,
    });

    // Handle empty results
    if (!result.data || result.data.length === 0) {
      return {
        data: [],
        error: null,
      };
    }

    return {
      data: result.data.map((row) => ({
        serviceName: row.serviceName,
        totalLogs: Number(row.totalLogCount ?? 0),
        totalTraces: Number(row.totalTraceCount ?? 0),
        totalMetrics:
          Number(row.totalSumMetricCount ?? 0) +
          Number(row.totalGaugeMetricCount ?? 0) +
          Number(row.totalHistogramMetricCount ?? 0) +
          Number(row.totalExpHistogramMetricCount ?? 0),
        dataSizeBytes: Number(row.totalSizeBytes ?? 0),
        logSizeBytes: Number(row.totalLogSizeBytes ?? 0),
        traceSizeBytes: Number(row.totalTraceSizeBytes ?? 0),
        metricSizeBytes:
          Number(row.totalSumMetricSizeBytes ?? 0) +
          Number(row.totalGaugeMetricSizeBytes ?? 0) +
          Number(row.totalHistogramMetricSizeBytes ?? 0) +
          Number(row.totalExpHistogramMetricSizeBytes ?? 0),
      })),
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getServiceUsage failed:", error);
    return {
      data: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch service usage",
    };
  }
}
