import alchemy from "alchemy"
import { Astro } from "alchemy/cloudflare"
import { CloudflareStateStore } from "alchemy/state"
import { parseRailwayDeploymentTarget } from "@maple/infra/railway"

const app = await alchemy("maple-landing", {
  ...(process.env.ALCHEMY_STATE_TOKEN
    ? {
        stateStore: (scope) => new CloudflareStateStore(scope),
      }
    : {}),
})

const deploymentTarget = parseRailwayDeploymentTarget(app.stage)

const landingDomains =
  deploymentTarget.kind === "prd"
    ? [
        {
          domainName: "maple.dev",
          adopt: true,
        },
      ]
    : deploymentTarget.kind === "stg"
      ? [
          {
            domainName: "staging-landing.maple.dev",
            adopt: true,
          },
        ]
      : undefined

const landingName =
  deploymentTarget.kind === "prd"
    ? "maple-landing"
    : deploymentTarget.kind === "stg"
      ? "maple-landing-stg"
      : `maple-landing-${app.stage}`

export const landing = await Astro("landing", {
  name: landingName,
  adopt: true,
  domains: landingDomains,
})

console.log({
  stage: app.stage,
  landingUrl: landingDomains?.[0]?.domainName
    ? `https://${landingDomains[0].domainName}`
    : landing.url,
})

await app.finalize()
