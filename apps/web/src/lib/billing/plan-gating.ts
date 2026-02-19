import type { Customer } from "autumn-js"

const ALLOWED_PRODUCT_STATUSES = new Set(["active", "trialing", "past_due"])

function isLegacyFreeProduct(product: Customer["products"][number]): boolean {
  if (product.id.toLowerCase() === "free") return true
  return product.name?.toLowerCase() === "free"
}

export function hasSelectedPlan(customer: Customer | null | undefined): boolean {
  if (!customer) return false

  return customer.products.some((product) => {
    if (product.is_add_on || product.is_default) return false
    if (isLegacyFreeProduct(product)) return false
    return ALLOWED_PRODUCT_STATUSES.has(product.status)
  })
}
