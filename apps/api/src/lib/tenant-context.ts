import { AsyncLocalStorage } from "node:async_hooks"

export interface TenantContext {
  orgId: string
  userId: string
  roles: string[]
  authMode: "clerk" | "self_hosted"
}

const storage = new AsyncLocalStorage<TenantContext>()

export function runWithTenantContext<T>(tenant: TenantContext, fn: () => T): T {
  return storage.run(tenant, fn)
}

export function getTenantContext(): TenantContext | undefined {
  return storage.getStore()
}
