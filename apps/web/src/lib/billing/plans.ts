export interface PlanLimits {
  logsGB: number
  tracesGB: number
  metricsGB: number
  retentionDays: number
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { logsGB: 1, tracesGB: 1, metricsGB: 0.5, retentionDays: 7 },
  pro: { logsGB: 50, tracesGB: 50, metricsGB: 25, retentionDays: 30 },
  enterprise: {
    logsGB: Infinity,
    tracesGB: Infinity,
    metricsGB: Infinity,
    retentionDays: 90,
  },
}

const DEFAULT_PLAN = "free"

export function getPlanLimits(planSlug: string | undefined): PlanLimits {
  return PLAN_LIMITS[planSlug ?? DEFAULT_PLAN] ?? PLAN_LIMITS[DEFAULT_PLAN]
}
