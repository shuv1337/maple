/**
 * Tinybird SDK - Exports Only
 *
 * This module exports all endpoint definitions and datasources.
 * Client creation should be done in the consuming application with proper configuration.
 *
 * @example
 * ```ts
 * import { Tinybird } from "@tinybirdco/sdk";
 * import { listTraces, spanHierarchy, listLogs } from "@maple/tinybird";
 *
 * const tinybird = new Tinybird({
 *   baseUrl: process.env.TINYBIRD_HOST,
 *   token: process.env.TINYBIRD_TOKEN,
 *   pipes: { list_traces: listTraces, ... },
 * });
 * ```
 */

// Export all endpoints and their types
export {
  listTraces,
  spanHierarchy,
  listLogs,
  logsCount,
  logsFacets,
  errorRateByService,
  getServiceUsage,
  type ListTracesParams,
  type ListTracesOutput,
  type SpanHierarchyParams,
  type SpanHierarchyOutput,
  type ListLogsParams,
  type ListLogsOutput,
  type LogsCountParams,
  type LogsCountOutput,
  type LogsFacetsParams,
  type LogsFacetsOutput,
  type ErrorRateByServiceParams,
  type ErrorRateByServiceOutput,
  type GetServiceUsageParams,
  type GetServiceUsageOutput,
} from "./endpoints";

// Export all datasources and their types
export {
  logs,
  traces,
  serviceUsage,
  metricsSum,
  metricsGauge,
  metricsHistogram,
  metricsExponentialHistogram,
  type LogsRow,
  type TracesRow,
  type ServiceUsageRow,
  type MetricsSumRow,
  type MetricsGaugeRow,
  type MetricsHistogramRow,
  type MetricsExponentialHistogramRow,
} from "./datasources";

// Export all materialized views
export {
  serviceUsageLogsMv,
  serviceUsageTracesMv,
  serviceUsageMetricsSumMv,
  serviceUsageMetricsGaugeMv,
  serviceUsageMetricsHistogramMv,
  serviceUsageMetricsExpHistogramMv,
} from "./materializations";
