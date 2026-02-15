import { ManagedRuntime } from "effect"
import type { TenantContext as McpTenantContext } from "@/lib/tenant-context"
import { AuthService } from "@/services/AuthService"

const AuthRuntime = ManagedRuntime.make(AuthService.Default)

const toHeaderRecord = (headers: Headers): Record<string, string> => {
  const record: Record<string, string> = {}

  for (const [name, value] of headers.entries()) {
    record[name] = value
  }

  return record
}

export async function resolveMcpTenantContext(request: Request): Promise<McpTenantContext> {
  const tenant = await AuthRuntime.runPromise(
    AuthService.resolveTenant(toHeaderRecord(request.headers)),
  )

  return {
    orgId: tenant.orgId,
    userId: tenant.userId,
    roles: [...tenant.roles],
    authMode: tenant.authMode,
  }
}
