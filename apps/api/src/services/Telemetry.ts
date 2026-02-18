import * as DevTools from "@effect/experimental/DevTools"
import * as Otlp from "@effect/opentelemetry/Otlp"
import * as FetchHttpClient from "@effect/platform/FetchHttpClient"
import { BunSocket } from "@effect/platform-bun"
import { Config, Effect, Layer, Option } from "effect"

export const TracerLive = Layer.unwrapEffect(
  Effect.gen(function* () {
    const environment = yield* Config.string("OTEL_ENVIRONMENT").pipe(
      Config.withDefault("local"),
    )

    if (environment === "local") {
      return DevTools.layerWebSocket().pipe(
        Layer.provide(BunSocket.layerWebSocketConstructor),
      )
    }

    const otelBaseUrl = yield* Config.option(Config.string("OTEL_BASE_URL"))

    if (Option.isNone(otelBaseUrl)) {
      return Layer.empty
    }

    const ingestKey = yield* Config.string("MAPLE_OTEL_INGEST_KEY").pipe(
      Config.withDefault(""),
    )
    const commitSha = yield* Config.string("RAILWAY_GIT_COMMIT_SHA").pipe(
      Config.orElse(() => Config.string("COMMIT_SHA")),
      Config.withDefault("unknown"),
    )

    return Otlp.layerJson({
      baseUrl: otelBaseUrl.value,
      resource: {
        serviceName: "maple-api",
        serviceVersion: commitSha,
        attributes: {
          "deployment.environment": environment,
          "deployment.commit_sha": commitSha,
        },
      },
      ...(ingestKey ? { headers: { Authorization: `Bearer ${ingestKey}` } } : {}),
    }).pipe(Layer.provide(FetchHttpClient.layer))
  }),
)
