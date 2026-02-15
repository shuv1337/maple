import { z } from "zod";
import { getTinybird } from "@/lib/tinybird";

export interface ErrorRateByService {
  serviceName: string;
  totalLogs: number;
  errorLogs: number;
  errorRatePercent: number;
}

export interface ErrorRateByServiceResponse {
  data: ErrorRateByService[];
  error: string | null;
}

const GetErrorRateByServiceInput = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});

export type GetErrorRateByServiceInput = z.infer<
  typeof GetErrorRateByServiceInput
>;

export async function getErrorRateByService({
  data,
}: {
  data: GetErrorRateByServiceInput
}): Promise<ErrorRateByServiceResponse> {
  data = GetErrorRateByServiceInput.parse(data ?? {})

  try {
    const tinybird = getTinybird();
    const result = await tinybird.query.error_rate_by_service({
      start_time: data.startTime,
      end_time: data.endTime,
    });

    return {
      data: result.data.map((row) => ({
        serviceName: row.serviceName,
        totalLogs: Number(row.totalLogs),
        errorLogs: Number(row.errorLogs),
        errorRatePercent: Number(row.errorRatePercent),
      })),
      error: null,
    };
  } catch (error) {
    console.error("[Tinybird] getErrorRateByService failed:", error);
    return {
      data: [],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch error rates",
    };
  }
}
