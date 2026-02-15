import { z } from "zod";
import { Effect, Schema } from "effect";
import {
  QueryEngineExecuteRequest,
  type QuerySpec,
  type TracesMetric,
  type MetricsMetric,
} from "@maple/domain";
import { getTinybird } from "@/lib/tinybird";
import {
  buildBucketTimeline,
  computeBucketSeconds,
  toIsoBucket,
} from "@/api/tinybird/timeseries-utils";
import { MapleApiAtomClient } from "@/lib/services/common/atom-client";
import { runtime } from "@/lib/services/common/runtime";
import type {
  ServiceDetailTimeSeriesPoint,
  ServiceDetailTimeSeriesResponse,
  ServiceTimeSeriesPoint,
  ServiceOverviewTimeSeriesResponse,
} from "@/api/tinybird/services";

// Date format: "YYYY-MM-DD HH:mm:ss" (Tinybird/ClickHouse compatible)
const dateTimeString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, "Invalid datetime format");

function sortByBucket<T extends { bucket: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => left.bucket.localeCompare(right.bucket));
}

function fillServiceDetailPoints(
  points: ServiceDetailTimeSeriesPoint[],
  startTime: string | undefined,
  endTime: string | undefined,
  bucketSeconds: number,
): ServiceDetailTimeSeriesPoint[] {
  const timeline = buildBucketTimeline(startTime, endTime, bucketSeconds);
  if (timeline.length === 0) {
    return sortByBucket(points);
  }

  const byBucket = new Map<string, ServiceDetailTimeSeriesPoint>();
  for (const point of points) {
    byBucket.set(toIsoBucket(point.bucket), point);
  }

  return timeline.map((bucket) => {
    const existing = byBucket.get(bucket);
    if (existing) {
      return existing;
    }

    return {
      bucket,
      throughput: 0,
      errorRate: 0,
      p50LatencyMs: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
    };
  });
}

function fillServiceSparklinePoints(
  points: ServiceTimeSeriesPoint[],
  timeline: string[],
): ServiceTimeSeriesPoint[] {
  if (timeline.length === 0) {
    return sortByBucket(points);
  }

  const byBucket = new Map<string, ServiceTimeSeriesPoint>();
  for (const point of points) {
    byBucket.set(toIsoBucket(point.bucket), point);
  }

  return timeline.map((bucket) => {
    const existing = byBucket.get(bucket);
    if (existing) {
      return existing;
    }

    return {
      bucket,
      throughput: 0,
      errorRate: 0,
    };
  });
}

// --- Time Series ---

const CustomChartTimeSeriesInput = z.object({
  source: z.enum(["traces", "logs", "metrics"]),
  metric: z.string(),
  groupBy: z
    .enum(["service", "span_name", "status_code", "severity", "attribute", "none"])
    .optional(),
  filters: z
    .object({
      serviceName: z.string().optional(),
      spanName: z.string().optional(),
      severity: z.string().optional(),
      metricName: z.string().optional(),
      metricType: z
        .enum(["sum", "gauge", "histogram", "exponential_histogram"])
        .optional(),
      rootSpansOnly: z.boolean().optional(),
      environments: z.array(z.string()).optional(),
      commitShas: z.array(z.string()).optional(),
      attributeKey: z.string().optional(),
      attributeValue: z.string().optional(),
    })
    .optional(),
  startTime: dateTimeString,
  endTime: dateTimeString,
  bucketSeconds: z.number().min(1).optional(),
});

export type CustomChartTimeSeriesInput = z.infer<
  typeof CustomChartTimeSeriesInput
>;

export interface CustomChartTimeSeriesPoint {
  bucket: string;
  series: Record<string, number>;
}

export interface CustomChartTimeSeriesResponse {
  data: CustomChartTimeSeriesPoint[];
  error: string | null;
}

const tracesMetrics = new Set<TracesMetric>([
  "count",
  "avg_duration",
  "p50_duration",
  "p95_duration",
  "p99_duration",
  "error_rate",
]);
const metricsMetrics = new Set<MetricsMetric>(["avg", "sum", "min", "max", "count"]);
const metricsBreakdownMetrics = new Set<"avg" | "sum" | "count">(["avg", "sum", "count"]);

function decodeQueryEngineRequest(input: unknown) {
  return Schema.decodeUnknownSync(QueryEngineExecuteRequest)(input);
}

function executeQueryEngine(payload: QueryEngineExecuteRequest) {
  return runtime.runPromise(
    Effect.gen(function* () {
      const client = yield* MapleApiAtomClient;
      return yield* client.queryEngine.execute({ payload });
    }),
  );
}

function buildTimeseriesQuerySpec(data: CustomChartTimeSeriesInput): QuerySpec | string {
  if (data.source === "traces") {
    if (!tracesMetrics.has(data.metric as TracesMetric)) {
      return `Unknown trace metric: ${data.metric}`;
    }
    if (
      data.groupBy &&
      !["service", "span_name", "status_code", "http_method", "attribute", "none"].includes(
        data.groupBy,
      )
    ) {
      return `Unsupported traces groupBy: ${data.groupBy}`;
    }

    return {
      kind: "timeseries",
      source: "traces",
      metric: data.metric as TracesMetric,
      groupBy: data.groupBy as "service" | "span_name" | "status_code" | "http_method" | "attribute" | "none" | undefined,
      filters: {
        serviceName: data.filters?.serviceName,
        spanName: data.filters?.spanName,
        rootSpansOnly: data.filters?.rootSpansOnly,
        environments: data.filters?.environments,
        commitShas: data.filters?.commitShas,
        attributeKey: data.filters?.attributeKey,
        attributeValue: data.filters?.attributeValue,
      },
      bucketSeconds: data.bucketSeconds,
    };
  }

  if (data.source === "logs") {
    if (data.metric !== "count") {
      return `Unknown logs metric: ${data.metric}`;
    }
    if (data.groupBy && !["service", "severity", "none"].includes(data.groupBy)) {
      return `Unsupported logs groupBy: ${data.groupBy}`;
    }

    return {
      kind: "timeseries",
      source: "logs",
      metric: "count",
      groupBy: data.groupBy as "service" | "severity" | "none" | undefined,
      filters: {
        serviceName: data.filters?.serviceName,
        severity: data.filters?.severity,
      },
      bucketSeconds: data.bucketSeconds,
    };
  }

  if (!metricsMetrics.has(data.metric as MetricsMetric)) {
    return `Unknown metrics metric: ${data.metric}`;
  }
  if (!data.filters?.metricName || !data.filters.metricType) {
    return "metricName and metricType are required for metrics source";
  }
  if (data.groupBy && !["service", "none"].includes(data.groupBy)) {
    return `Unsupported metrics groupBy: ${data.groupBy}`;
  }

  return {
    kind: "timeseries",
    source: "metrics",
    metric: data.metric as MetricsMetric,
    groupBy: data.groupBy === "none" ? "none" : "service",
    filters: {
      metricName: data.filters.metricName,
      metricType: data.filters.metricType,
      serviceName: data.filters.serviceName,
    },
    bucketSeconds: data.bucketSeconds,
  };
}

export async function getCustomChartTimeSeries({
  data,
}: {
  data: CustomChartTimeSeriesInput
}): Promise<CustomChartTimeSeriesResponse> {
  data = CustomChartTimeSeriesInput.parse(data)

  try {
    const query = buildTimeseriesQuerySpec(data);
    if (typeof query === "string") {
      return { data: [], error: query };
    }

    const request = decodeQueryEngineRequest({
      startTime: data.startTime,
      endTime: data.endTime,
      query,
    });

    const response = await executeQueryEngine(request);
    if (response.result.kind !== "timeseries") {
      return { data: [], error: "Unexpected query result kind" };
    }

    return {
      data: response.result.data.map((point) => ({
        bucket: point.bucket,
        series: { ...point.series },
      })),
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getCustomChartTimeSeries failed:", error);
    return {
      data: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch custom chart time series",
    };
  }
}

// --- Breakdown ---

const CustomChartBreakdownInput = z.object({
  source: z.enum(["traces", "logs", "metrics"]),
  metric: z.string(),
  groupBy: z.enum([
    "service",
    "span_name",
    "status_code",
    "http_method",
    "severity",
    "attribute",
  ]),
  filters: z
    .object({
      serviceName: z.string().optional(),
      spanName: z.string().optional(),
      severity: z.string().optional(),
      metricName: z.string().optional(),
      metricType: z
        .enum(["sum", "gauge", "histogram", "exponential_histogram"])
        .optional(),
      rootSpansOnly: z.boolean().optional(),
      environments: z.array(z.string()).optional(),
      commitShas: z.array(z.string()).optional(),
      attributeKey: z.string().optional(),
      attributeValue: z.string().optional(),
    })
    .optional(),
  startTime: dateTimeString,
  endTime: dateTimeString,
  limit: z.number().min(1).max(100).optional(),
});

export type CustomChartBreakdownInput = z.infer<
  typeof CustomChartBreakdownInput
>;

export interface CustomChartBreakdownItem {
  name: string;
  value: number;
}

export interface CustomChartBreakdownResponse {
  data: CustomChartBreakdownItem[];
  error: string | null;
}

function buildBreakdownQuerySpec(data: CustomChartBreakdownInput): QuerySpec | string {
  if (data.source === "traces") {
    if (!tracesMetrics.has(data.metric as TracesMetric)) {
      return `Unknown trace metric: ${data.metric}`;
    }
    if (
      !["service", "span_name", "status_code", "http_method", "attribute"].includes(data.groupBy)
    ) {
      return `Unsupported traces groupBy: ${data.groupBy}`;
    }

    return {
      kind: "breakdown",
      source: "traces",
      metric: data.metric as TracesMetric,
      groupBy: data.groupBy as "service" | "span_name" | "status_code" | "http_method" | "attribute",
      filters: {
        serviceName: data.filters?.serviceName,
        spanName: data.filters?.spanName,
        rootSpansOnly: data.filters?.rootSpansOnly,
        environments: data.filters?.environments,
        commitShas: data.filters?.commitShas,
        attributeKey: data.filters?.attributeKey,
        attributeValue: data.filters?.attributeValue,
      },
      limit: data.limit,
    };
  }

  if (data.source === "logs") {
    if (data.metric !== "count") {
      return `Unknown logs metric: ${data.metric}`;
    }
    if (!["service", "severity"].includes(data.groupBy)) {
      return `Unsupported logs groupBy: ${data.groupBy}`;
    }

    return {
      kind: "breakdown",
      source: "logs",
      metric: "count",
      groupBy: data.groupBy as "service" | "severity",
      filters: {
        serviceName: data.filters?.serviceName,
        severity: data.filters?.severity,
      },
      limit: data.limit,
    };
  }

  if (!metricsBreakdownMetrics.has(data.metric as "avg" | "sum" | "count")) {
    return `Unknown metrics metric: ${data.metric}`;
  }
  if (!data.filters?.metricName || !data.filters.metricType) {
    return "metricName and metricType are required for metrics source";
  }
  if (data.groupBy !== "service") {
    return `Unsupported metrics groupBy: ${data.groupBy}`;
  }

  return {
    kind: "breakdown",
    source: "metrics",
    metric: data.metric as "avg" | "sum" | "count",
    groupBy: "service",
    filters: {
      metricName: data.filters.metricName,
      metricType: data.filters.metricType,
      serviceName: data.filters.serviceName,
    },
    limit: data.limit,
  };
}

export async function getCustomChartBreakdown({
  data,
}: {
  data: CustomChartBreakdownInput
}): Promise<CustomChartBreakdownResponse> {
  data = CustomChartBreakdownInput.parse(data)

  try {
    const query = buildBreakdownQuerySpec(data);
    if (typeof query === "string") {
      return { data: [], error: query };
    }

    const request = decodeQueryEngineRequest({
      startTime: data.startTime,
      endTime: data.endTime,
      query,
    });
    const response = await executeQueryEngine(request);
    if (response.result.kind !== "breakdown") {
      return { data: [], error: "Unexpected query result kind" };
    }

    return {
      data: response.result.data.map((item) => ({
        name: item.name,
        value: item.value,
      })),
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getCustomChartBreakdown failed:", error);
    return {
      data: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch custom chart breakdown",
    };
  }
}

// --- Service Detail (via custom traces timeseries) ---

const GetCustomChartServiceDetailInput = z.object({
  serviceName: z.string(),
  startTime: dateTimeString.optional(),
  endTime: dateTimeString.optional(),
});

export async function getCustomChartServiceDetail({
  data,
}: {
  data: z.infer<typeof GetCustomChartServiceDetailInput>
}): Promise<ServiceDetailTimeSeriesResponse> {
  data = GetCustomChartServiceDetailInput.parse(data)

  try {
    const tinybird = getTinybird();
    const bucketSeconds = computeBucketSeconds(data.startTime, data.endTime);
    const result = await tinybird.query.custom_traces_timeseries({
      start_time: data.startTime!,
      end_time: data.endTime!,
      bucket_seconds: bucketSeconds,
      service_name: data.serviceName,
      root_only: "1",
    });

    const points = result.data.map(
      (row): ServiceDetailTimeSeriesPoint => ({
        bucket: toIsoBucket(row.bucket),
        throughput: Number(row.count),
        errorRate: Number(row.errorRate),
        p50LatencyMs: Number(row.p50Duration),
        p95LatencyMs: Number(row.p95Duration),
        p99LatencyMs: Number(row.p99Duration),
      }),
    );

    return {
      data: fillServiceDetailPoints(
        points,
        data.startTime,
        data.endTime,
        bucketSeconds,
      ),
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getCustomChartServiceDetail failed:", error);
    return {
      data: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch service detail time series",
    };
  }
}

// --- Overview Time Series (all services aggregated, optional env filter) ---

const GetOverviewTimeSeriesInput = z.object({
  startTime: dateTimeString.optional(),
  endTime: dateTimeString.optional(),
  environments: z.array(z.string()).optional(),
});

export async function getOverviewTimeSeries({
  data,
}: {
  data: z.infer<typeof GetOverviewTimeSeriesInput>
}): Promise<ServiceDetailTimeSeriesResponse> {
  data = GetOverviewTimeSeriesInput.parse(data ?? {})

  try {
    const tinybird = getTinybird();
    const bucketSeconds = computeBucketSeconds(data.startTime, data.endTime);
    const result = await tinybird.query.custom_traces_timeseries({
      start_time: data.startTime!,
      end_time: data.endTime!,
      bucket_seconds: bucketSeconds,
      root_only: "1",
      environments: data.environments?.join(","),
    });

    const points = result.data.map(
      (row): ServiceDetailTimeSeriesPoint => ({
        bucket: toIsoBucket(row.bucket),
        throughput: Number(row.count),
        errorRate: Number(row.errorRate),
        p50LatencyMs: Number(row.p50Duration),
        p95LatencyMs: Number(row.p95Duration),
        p99LatencyMs: Number(row.p99Duration),
      }),
    );

    return {
      data: fillServiceDetailPoints(
        points,
        data.startTime,
        data.endTime,
        bucketSeconds,
      ),
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getOverviewTimeSeries failed:", error);
    return {
      data: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch overview time series",
    };
  }
}

// --- Service Sparklines (via custom traces timeseries with group_by_service) ---

const GetCustomChartServiceSparklinesInput = z.object({
  startTime: dateTimeString.optional(),
  endTime: dateTimeString.optional(),
  environments: z.array(z.string()).optional(),
  commitShas: z.array(z.string()).optional(),
});

export async function getCustomChartServiceSparklines({
  data,
}: {
  data: z.infer<typeof GetCustomChartServiceSparklinesInput>
}): Promise<ServiceOverviewTimeSeriesResponse> {
  data = GetCustomChartServiceSparklinesInput.parse(data ?? {})

  try {
    const tinybird = getTinybird();
    const bucketSeconds = computeBucketSeconds(data.startTime, data.endTime);
    const result = await tinybird.query.custom_traces_timeseries({
      start_time: data.startTime!,
      end_time: data.endTime!,
      bucket_seconds: bucketSeconds,
      root_only: "1",
      group_by_service: "1",
      environments: data.environments?.join(","),
      commit_shas: data.commitShas?.join(","),
    });

    const timeline = buildBucketTimeline(
      data.startTime,
      data.endTime,
      bucketSeconds,
    );
    const grouped: Record<string, ServiceTimeSeriesPoint[]> = {};
    for (const row of result.data) {
      const bucket = toIsoBucket(row.bucket);
      const point: ServiceTimeSeriesPoint = {
        bucket,
        throughput: Number(row.count),
        errorRate: Number(row.errorRate),
      };
      if (!grouped[row.groupName]) {
        grouped[row.groupName] = [];
      }
      grouped[row.groupName].push(point);
    }

    const filledGrouped = Object.fromEntries(
      Object.entries(grouped).map(([service, points]) => [
        service,
        fillServiceSparklinePoints(points, timeline),
      ]),
    );

    return { data: filledGrouped, error: null };
  } catch (error) {
    console.error(
      "[Tinybird] getCustomChartServiceSparklines failed:",
      error,
    );
    return {
      data: {},
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch service sparklines",
    };
  }
}
