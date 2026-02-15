export type RailwayDeploymentTarget =
  | { kind: "prd" }
  | { kind: "stg" }
  | { kind: "pr"; prNumber: number }

const PR_STAGE_RE = /^pr-(\d+)$/

export interface RailwayResolvedTarget {
  stage: string
  environmentName: string
  suffix: string
}

export function parseRailwayDeploymentTarget(stage: string): RailwayDeploymentTarget {
  const normalized = stage.trim().toLowerCase()

  if (normalized === "prd") {
    return { kind: "prd" }
  }

  if (normalized === "stg") {
    return { kind: "stg" }
  }

  const prMatch = normalized.match(PR_STAGE_RE)
  if (prMatch) {
    const prNumber = Number(prMatch[1])
    if (Number.isSafeInteger(prNumber) && prNumber > 0) {
      return { kind: "pr", prNumber }
    }
  }

  throw new Error(
    `Unsupported deployment stage "${stage}". Expected one of: prd, stg, pr-<number>.`,
  )
}

export function formatRailwayTargetStage(target: RailwayDeploymentTarget): string {
  switch (target.kind) {
    case "prd":
      return "prd"
    case "stg":
      return "stg"
    case "pr":
      return `pr-${target.prNumber}`
  }
}

export function resolveRailwayTarget(target: RailwayDeploymentTarget): RailwayResolvedTarget {
  switch (target.kind) {
    case "prd":
      return {
        stage: "prd",
        environmentName: "production",
        suffix: "",
      }
    case "stg":
      return {
        stage: "stg",
        environmentName: "stg",
        suffix: "-stg",
      }
    case "pr": {
      const suffix = `-pr-${target.prNumber}`
      return {
        stage: formatRailwayTargetStage(target),
        environmentName: formatRailwayTargetStage(target),
        suffix,
      }
    }
  }
}

export function resolveRailwayServiceName(
  baseName: string,
  target: RailwayDeploymentTarget,
): string {
  const resolvedTarget = resolveRailwayTarget(target)
  return resolvedTarget.suffix.length > 0 ? `${baseName}${resolvedTarget.suffix}` : baseName
}
