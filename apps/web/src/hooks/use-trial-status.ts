import { useMemo } from "react"
import { useCustomer } from "autumn-js/react"
import { getActivePlan } from "@/lib/billing/plan-gating"

export function useTrialStatus() {
  const { customer, isLoading } = useCustomer()

  return useMemo(() => {
    const plan = getActivePlan(customer)

    if (!plan) {
      return {
        isTrialing: false,
        daysRemaining: null,
        trialEndsAt: null,
        planName: null,
        planId: null,
        planStatus: null,
        isLoading,
      }
    }

    const isTrialing = plan.status === "trialing"
    let daysRemaining: number | null = null
    let trialEndsAt: Date | null = null

    if (isTrialing && plan.trial_ends_at) {
      trialEndsAt = new Date(plan.trial_ends_at * 1000)
      const msRemaining = trialEndsAt.getTime() - Date.now()
      daysRemaining = msRemaining > 0 ? Math.ceil(msRemaining / (1000 * 60 * 60 * 24)) : 0
    }

    return {
      isTrialing,
      daysRemaining,
      trialEndsAt,
      planName: plan.name ?? plan.id,
      planId: plan.id,
      planStatus: plan.status,
      isLoading,
    }
  }, [customer, isLoading])
}
