import { z } from "zod";
import { getTinybird, type ListMetricsOutput, type MetricTimeSeriesSumOutput, type MetricsSummaryOutput } from "@/lib/tinybird";

// Input validation schemas
const ListMetricsInput = z.object({
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
  service: z.string().optional(),
  metricType: z.enum(["sum", "gauge", "histogram", "exponential_histogram"]).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  search: z.string().optional(),
});

export type ListMetricsInput = z.infer<typeof ListMetricsInput>;

export interface Metric {
  metricName: string;
  metricType: string;
  serviceName: string;
  metricDescription: string;
  metricUnit: string;
  dataPointCount: number;
  firstSeen: string;
  lastSeen: string;
}

export interface MetricsResponse {
  data: Metric[];
  error: string | null;
}

function transformMetric(raw: ListMetricsOutput): Metric {
  return {
    metricName: raw.metricName,
    metricType: raw.metricType,
    serviceName: raw.serviceName,
    metricDescription: raw.metricDescription,
    metricUnit: raw.metricUnit,
    dataPointCount: Number(raw.dataPointCount),
    firstSeen: String(raw.firstSeen),
    lastSeen: String(raw.lastSeen),
  };
}

export async function listMetrics({
  data,
}: {
  data: ListMetricsInput
}): Promise<MetricsResponse> {
  data = ListMetricsInput.parse(data ?? {})

  try {
    const tinybird = getTinybird();

    const result = await tinybird.query.list_metrics({
      limit: data.limit,
      offset: data.offset,
      service: data.service,
      metric_type: data.metricType,
      start_time: data.startTime,
      end_time: data.endTime,
      search: data.search,
    });

    return {
      data: result.data.map(transformMetric),
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] listMetrics failed:", error);
    return {
      data: [],
      error: error instanceof Error ? error.message : "Failed to fetch metrics",
    };
  }
}

// Time series input
const GetMetricTimeSeriesInput = z.object({
  metricName: z.string(),
  metricType: z.enum(["sum", "gauge", "histogram", "exponential_histogram"]),
  service: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  bucketSeconds: z.number().min(1).optional(),
});

export type GetMetricTimeSeriesInput = z.infer<typeof GetMetricTimeSeriesInput>;

export interface MetricTimeSeriesPoint {
  bucket: string;
  serviceName: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  sumValue: number;
  dataPointCount: number;
}

export interface MetricTimeSeriesResponse {
  data: MetricTimeSeriesPoint[];
  error: string | null;
}

function transformTimeSeriesPoint(raw: MetricTimeSeriesSumOutput): MetricTimeSeriesPoint {
  return {
    bucket: String(raw.bucket),
    serviceName: raw.serviceName,
    avgValue: raw.avgValue,
    minValue: raw.minValue,
    maxValue: raw.maxValue,
    sumValue: raw.sumValue,
    dataPointCount: Number(raw.dataPointCount),
  };
}

export async function getMetricTimeSeries({
  data,
}: {
  data: GetMetricTimeSeriesInput
}): Promise<MetricTimeSeriesResponse> {
  data = GetMetricTimeSeriesInput.parse(data)

  try {
    const tinybird = getTinybird();

    const params = {
      metric_name: data.metricName,
      service: data.service,
      start_time: data.startTime,
      end_time: data.endTime,
      bucket_seconds: data.bucketSeconds,
    };

    let result;
    switch (data.metricType) {
      case "sum":
        result = await tinybird.query.metric_time_series_sum(params);
        break;
      case "gauge":
        result = await tinybird.query.metric_time_series_gauge(params);
        break;
      case "histogram":
        result = await tinybird.query.metric_time_series_histogram(params);
        break;
      case "exponential_histogram":
        result = await tinybird.query.metric_time_series_exp_histogram(params);
        break;
      default:
        return {
          data: [],
          error: `Unknown metric type: ${data.metricType}`,
        };
    }

    return {
      data: result.data.map(transformTimeSeriesPoint),
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getMetricTimeSeries failed:", error);
    return {
      data: [],
      error: error instanceof Error ? error.message : "Failed to fetch metric time series",
    };
  }
}

// Summary input
const GetMetricsSummaryInput = z.object({
  service: z.string().optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

export type GetMetricsSummaryInput = z.infer<typeof GetMetricsSummaryInput>;

export interface MetricTypeSummary {
  metricType: string;
  metricCount: number;
  dataPointCount: number;
}

export interface MetricsSummaryResponse {
  data: MetricTypeSummary[];
  error: string | null;
}

function transformSummary(raw: MetricsSummaryOutput): MetricTypeSummary {
  return {
    metricType: raw.metricType,
    metricCount: Number(raw.metricCount),
    dataPointCount: Number(raw.dataPointCount),
  };
}

export async function getMetricsSummary({
  data,
}: {
  data: GetMetricsSummaryInput
}): Promise<MetricsSummaryResponse> {
  data = GetMetricsSummaryInput.parse(data ?? {})

  try {
    const tinybird = getTinybird();

    const result = await tinybird.query.metrics_summary({
      service: data.service,
      start_time: data.startTime,
      end_time: data.endTime,
    });

    return {
      data: result.data.map(transformSummary),
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getMetricsSummary failed:", error);
    return {
      data: [],
      error: error instanceof Error ? error.message : "Failed to fetch metrics summary",
    };
  }
}
