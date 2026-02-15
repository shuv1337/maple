import type { TinybirdPipe } from "@maple/domain"
import { ManagedRuntime } from "effect"
import { getTenantContext } from "@/lib/tenant-context"
import { TinybirdService } from "@/services/TinybirdService"

const TinybirdRuntime = ManagedRuntime.make(TinybirdService.Default)

export async function queryTinybird<T = any>(
  pipe: TinybirdPipe,
  params?: Record<string, unknown>,
): Promise<{ data: T[] }> {
  const tenant = getTenantContext()
  if (!tenant) {
    return Promise.reject(new Error("Tenant context is missing for this request"))
  }

  const response = await TinybirdRuntime.runPromise(
    TinybirdService.query(tenant, {
      pipe,
      params,
    }),
  )

  return {
    data: response.data as T[],
  }
}
