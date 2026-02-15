import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  formatRailwayTargetStage,
  parseRailwayDeploymentTarget,
  resolveRailwayServiceName,
  resolveRailwayTarget,
} from "./target"

describe("parseRailwayDeploymentTarget", () => {
  it("parses prd", () => {
    assert.deepEqual(parseRailwayDeploymentTarget("prd"), { kind: "prd" })
  })

  it("parses stg", () => {
    assert.deepEqual(parseRailwayDeploymentTarget("stg"), { kind: "stg" })
  })

  it("parses pr stage with number", () => {
    assert.deepEqual(parseRailwayDeploymentTarget("pr-123"), {
      kind: "pr",
      prNumber: 123,
    })
  })

  it("throws for unsupported stage", () => {
    assert.throws(
      () => parseRailwayDeploymentTarget("prod"),
      /Expected one of: prd, stg, pr-<number>\./,
    )
  })
})

describe("resolveRailwayTarget", () => {
  it("resolves production names", () => {
    const resolved = resolveRailwayTarget({ kind: "prd" })
    assert.equal(resolved.environmentName, "production")
    assert.equal(resolveRailwayServiceName("api", { kind: "prd" }), "api")
    assert.equal(resolveRailwayServiceName("ingest", { kind: "prd" }), "ingest")
    assert.equal(resolveRailwayServiceName("otel-collector", { kind: "prd" }), "otel-collector")
    assert.equal(formatRailwayTargetStage({ kind: "prd" }), "prd")
  })

  it("resolves staging names", () => {
    const resolved = resolveRailwayTarget({ kind: "stg" })
    assert.equal(resolved.environmentName, "stg")
    assert.equal(resolveRailwayServiceName("api", { kind: "stg" }), "api-stg")
    assert.equal(resolveRailwayServiceName("ingest", { kind: "stg" }), "ingest-stg")
    assert.equal(
      resolveRailwayServiceName("otel-collector", { kind: "stg" }),
      "otel-collector-stg",
    )
    assert.equal(formatRailwayTargetStage({ kind: "stg" }), "stg")
  })

  it("resolves preview names", () => {
    const resolved = resolveRailwayTarget({ kind: "pr", prNumber: 123 })
    assert.equal(resolved.environmentName, "pr-123")
    assert.equal(
      resolveRailwayServiceName("api", { kind: "pr", prNumber: 123 }),
      "api-pr-123",
    )
    assert.equal(
      resolveRailwayServiceName("ingest", { kind: "pr", prNumber: 123 }),
      "ingest-pr-123",
    )
    assert.equal(
      resolveRailwayServiceName("otel-collector", { kind: "pr", prNumber: 123 }),
      "otel-collector-pr-123",
    )
    assert.equal(formatRailwayTargetStage({ kind: "pr", prNumber: 123 }), "pr-123")
  })
})
