import { z } from "zod";
import { getTinybird, type ListLogsOutput } from "@/lib/tinybird";

// Input validation schemas
const ListLogsInput = z.object({
  limit: z.number().min(1).max(1000).optional(),
  service: z.string().optional(),
  severity: z.string().optional(),
  minSeverity: z.number().min(0).max(255).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),
  cursor: z.string().optional(),
  search: z.string().optional(),
});

export type ListLogsInput = z.infer<typeof ListLogsInput>;

// Default values applied at runtime
const DEFAULT_LIMIT = 100;

// Log entry for client use (now matches endpoint output directly)
export interface Log {
  timestamp: string;
  severityText: string;
  severityNumber: number;
  serviceName: string;
  body: string;
  traceId: string;
  spanId: string;
  logAttributes: Record<string, string>;
  resourceAttributes: Record<string, string>;
}

export interface LogsResponse {
  data: Log[];
  meta: {
    limit: number;
    total: number;
    cursor: string | null;
  };
  error: string | null;
}

export interface LogsCountResponse {
  data: Array<{ total: number }>;
  error: string | null;
}

function transformLog(raw: ListLogsOutput): Log {
  return {
    timestamp: String(raw.timestamp),
    severityText: raw.severityText,
    severityNumber: Number(raw.severityNumber),
    serviceName: raw.serviceName,
    body: raw.body,
    traceId: raw.traceId,
    spanId: raw.spanId,
    logAttributes: raw.logAttributes ? JSON.parse(raw.logAttributes) : {},
    resourceAttributes: raw.resourceAttributes ? JSON.parse(raw.resourceAttributes) : {},
  };
}

export async function listLogs({
  data,
}: {
  data: ListLogsInput
}): Promise<LogsResponse> {
  data = ListLogsInput.parse(data ?? {})
  const limit = data.limit ?? DEFAULT_LIMIT;

  try {
    const tinybird = getTinybird();

    const [logsResult, countResult] = await Promise.all([
      tinybird.query.list_logs({
        limit,
        service: data.service,
        severity: data.severity,
        min_severity: data.minSeverity,
        start_time: data.startTime,
        end_time: data.endTime,
        trace_id: data.traceId,
        span_id: data.spanId,
        cursor: data.cursor,
        search: data.search,
      }),
      tinybird.query.logs_count({
        service: data.service,
        severity: data.severity,
        start_time: data.startTime,
        end_time: data.endTime,
        trace_id: data.traceId,
        search: data.search,
      }),
    ]);

    const total = Number(countResult.data[0]?.total ?? 0);
    const logs = logsResult.data.map(transformLog);

    // Cursor for next page (last timestamp if we have more data)
    const cursor =
      logs.length === limit && logs.length > 0
        ? logs[logs.length - 1].timestamp
        : null;

    return {
      data: logs,
      meta: {
        limit,
        total,
        cursor,
      },
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] listLogs failed:", error);
    return {
      data: [],
      meta: {
        limit,
        total: 0,
        cursor: null,
      },
      error: error instanceof Error ? error.message : "Failed to fetch logs",
    };
  }
}

export async function getLogsCount({
  data,
}: {
  data: ListLogsInput
}): Promise<LogsCountResponse> {
  data = ListLogsInput.parse(data ?? {})

  try {
    const tinybird = getTinybird();
    const countResult = await tinybird.query.logs_count({
      service: data.service,
      severity: data.severity,
      start_time: data.startTime,
      end_time: data.endTime,
      trace_id: data.traceId,
      search: data.search,
    });

    return {
      data: [{ total: Number(countResult.data[0]?.total ?? 0) }],
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getLogsCount failed:", error);
    return {
      data: [{ total: 0 }],
      error: error instanceof Error ? error.message : "Failed to fetch log count",
    };
  }
}

export interface FacetItem {
  name: string;
  count: number;
}

export interface LogsFacets {
  services: FacetItem[];
  severities: FacetItem[];
}

export interface LogsFacetsResponse {
  data: LogsFacets;
  error: string | null;
}

const GetLogsFacetsInput = z.object({
  service: z.string().optional(),
  severity: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export type GetLogsFacetsInput = z.infer<typeof GetLogsFacetsInput>;

export async function getLogsFacets({
  data,
}: {
  data: GetLogsFacetsInput
}): Promise<LogsFacetsResponse> {
  data = GetLogsFacetsInput.parse(data ?? {})

  try {
    const tinybird = getTinybird();
    const result = await tinybird.query.logs_facets({
      service: data.service,
      severity: data.severity,
      start_time: data.startTime,
      end_time: data.endTime,
    });

    const services: FacetItem[] = [];
    const severities: FacetItem[] = [];

    for (const row of result.data) {
      const count = Number(row.count);
      if (row.facetType === "service" && row.serviceName) {
        services.push({ name: row.serviceName, count });
      } else if (row.facetType === "severity" && row.severityText) {
        severities.push({ name: row.severityText, count });
      }
    }

    return {
      data: { services, severities },
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getLogsFacets failed:", error);
    return {
      data: {
        services: [],
        severities: [],
      },
      error:
        error instanceof Error ? error.message : "Failed to fetch log facets",
    };
  }
}
