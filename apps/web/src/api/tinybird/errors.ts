import { z } from "zod";
import { getTinybird, type ErrorsByTypeOutput, type ErrorDetailTracesOutput, type ErrorsFacetsOutput, type ErrorsSummaryOutput } from "@/lib/tinybird";
import { getSpamPatternsParam } from "@/lib/spam-patterns";

// Date format: "YYYY-MM-DD HH:mm:ss" (Tinybird/ClickHouse compatible)
const dateTimeString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, "Invalid datetime format");

// Error by type types
export interface ErrorByType {
  errorType: string;
  count: number;
  affectedServicesCount: number;
  firstSeen: Date;
  lastSeen: Date;
  affectedServices: string[];
}

export interface ErrorsByTypeResponse {
  data: ErrorByType[];
  error: string | null;
}

const GetErrorsByTypeInput = z.object({
  startTime: dateTimeString.optional(),
  endTime: dateTimeString.optional(),
  services: z.array(z.string()).optional(),
  deploymentEnvs: z.array(z.string()).optional(),
  errorTypes: z.array(z.string()).optional(),
  limit: z.number().optional(),
  showSpam: z.boolean().optional(),
});

export type GetErrorsByTypeInput = z.infer<typeof GetErrorsByTypeInput>;

function transformErrorByType(raw: ErrorsByTypeOutput): ErrorByType {
  return {
    errorType: raw.errorType,
    count: Number(raw.count),
    affectedServicesCount: Number(raw.affectedServicesCount),
    firstSeen: new Date(raw.firstSeen),
    lastSeen: new Date(raw.lastSeen),
    affectedServices: raw.affectedServices,
  };
}

export async function getErrorsByType({
  data,
}: {
  data: GetErrorsByTypeInput
}): Promise<ErrorsByTypeResponse> {
  data = GetErrorsByTypeInput.parse(data ?? {})

  try {
    const tinybird = getTinybird();
    const result = await tinybird.query.errors_by_type({
      start_time: data.startTime,
      end_time: data.endTime,
      services: data.services?.join(","),
      deployment_envs: data.deploymentEnvs?.join(","),
      error_types: data.errorTypes?.join(","),
      limit: data.limit,
      exclude_spam_patterns: getSpamPatternsParam(data.showSpam),
    });

    return {
      data: result.data.map(transformErrorByType),
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getErrorsByType failed:", error);
    return {
      data: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch errors by type",
    };
  }
}

// Error facets types
export interface FacetItem {
  name: string;
  count: number;
}

export interface ErrorsFacets {
  services: FacetItem[];
  deploymentEnvs: FacetItem[];
  errorTypes: FacetItem[];
}

export interface ErrorsFacetsResponse {
  data: ErrorsFacets;
  error: string | null;
}

const GetErrorsFacetsInput = z.object({
  startTime: dateTimeString.optional(),
  endTime: dateTimeString.optional(),
  services: z.array(z.string()).optional(),
  deploymentEnvs: z.array(z.string()).optional(),
  errorTypes: z.array(z.string()).optional(),
  showSpam: z.boolean().optional(),
});

export type GetErrorsFacetsInput = z.infer<typeof GetErrorsFacetsInput>;

function transformErrorsFacets(facetsData: ErrorsFacetsOutput[]): ErrorsFacets {
  const services: FacetItem[] = [];
  const deploymentEnvs: FacetItem[] = [];
  const errorTypes: FacetItem[] = [];

  for (const row of facetsData) {
    const item = { name: row.name, count: Number(row.count) };
    switch (row.facetType) {
      case "service":
        services.push(item);
        break;
      case "deploymentEnv":
        deploymentEnvs.push(item);
        break;
      case "errorType":
        errorTypes.push(item);
        break;
    }
  }

  return { services, deploymentEnvs, errorTypes };
}

export async function getErrorsFacets({
  data,
}: {
  data: GetErrorsFacetsInput
}): Promise<ErrorsFacetsResponse> {
  data = GetErrorsFacetsInput.parse(data ?? {})

  try {
    const tinybird = getTinybird();
    const result = await tinybird.query.errors_facets({
      start_time: data.startTime,
      end_time: data.endTime,
      services: data.services?.join(","),
      deployment_envs: data.deploymentEnvs?.join(","),
      error_types: data.errorTypes?.join(","),
      exclude_spam_patterns: getSpamPatternsParam(data.showSpam),
    });

    return {
      data: transformErrorsFacets(result.data),
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getErrorsFacets failed:", error);
    return {
      data: {
        services: [],
        deploymentEnvs: [],
        errorTypes: [],
      },
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch errors facets",
    };
  }
}

// Error summary types
export interface ErrorsSummary {
  totalErrors: number;
  totalSpans: number;
  errorRate: number;
  affectedServicesCount: number;
  affectedTracesCount: number;
}

export interface ErrorsSummaryResponse {
  data: ErrorsSummary | null;
  error: string | null;
}

const GetErrorsSummaryInput = z.object({
  startTime: dateTimeString.optional(),
  endTime: dateTimeString.optional(),
  services: z.array(z.string()).optional(),
  deploymentEnvs: z.array(z.string()).optional(),
  errorTypes: z.array(z.string()).optional(),
  showSpam: z.boolean().optional(),
});

export type GetErrorsSummaryInput = z.infer<typeof GetErrorsSummaryInput>;

function transformErrorsSummary(raw: ErrorsSummaryOutput): ErrorsSummary {
  return {
    totalErrors: Number(raw.totalErrors),
    totalSpans: Number(raw.totalSpans),
    errorRate: Number(raw.errorRate),
    affectedServicesCount: Number(raw.affectedServicesCount),
    affectedTracesCount: Number(raw.affectedTracesCount),
  };
}

export async function getErrorsSummary({
  data,
}: {
  data: GetErrorsSummaryInput
}): Promise<ErrorsSummaryResponse> {
  data = GetErrorsSummaryInput.parse(data ?? {})

  try {
    const tinybird = getTinybird();
    const result = await tinybird.query.errors_summary({
      start_time: data.startTime,
      end_time: data.endTime,
      services: data.services?.join(","),
      deployment_envs: data.deploymentEnvs?.join(","),
      error_types: data.errorTypes?.join(","),
      exclude_spam_patterns: getSpamPatternsParam(data.showSpam),
    });

    const summary = result.data[0];
    return {
      data: summary ? transformErrorsSummary(summary) : null,
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getErrorsSummary failed:", error);
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch errors summary",
    };
  }
}

// Error detail traces types
export interface ErrorDetailTrace {
  traceId: string;
  startTime: Date;
  durationMicros: number;
  spanCount: number;
  services: string[];
  rootSpanName: string;
  errorMessage: string;
}

export interface ErrorDetailTracesResponse {
  data: ErrorDetailTrace[];
  error: string | null;
}

const GetErrorDetailTracesInput = z.object({
  errorType: z.string(),
  startTime: dateTimeString.optional(),
  endTime: dateTimeString.optional(),
  services: z.array(z.string()).optional(),
  limit: z.number().optional(),
  showSpam: z.boolean().optional(),
});

export type GetErrorDetailTracesInput = z.infer<typeof GetErrorDetailTracesInput>;

function transformErrorDetailTrace(raw: ErrorDetailTracesOutput): ErrorDetailTrace {
  return {
    traceId: raw.traceId,
    startTime: new Date(raw.startTime),
    durationMicros: Number(raw.durationMicros),
    spanCount: Number(raw.spanCount),
    services: raw.services,
    rootSpanName: raw.rootSpanName,
    errorMessage: raw.errorMessage,
  };
}

export async function getErrorDetailTraces({
  data,
}: {
  data: GetErrorDetailTracesInput
}): Promise<ErrorDetailTracesResponse> {
  data = GetErrorDetailTracesInput.parse(data ?? {})

  try {
    const tinybird = getTinybird();
    const result = await tinybird.query.error_detail_traces({
      error_type: data.errorType,
      start_time: data.startTime,
      end_time: data.endTime,
      services: data.services?.join(","),
      limit: data.limit,
      exclude_spam_patterns: getSpamPatternsParam(data.showSpam),
    });

    return {
      data: result.data.map(transformErrorDetailTrace),
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getErrorDetailTraces failed:", error);
    return {
      data: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch error detail traces",
    };
  }
}
