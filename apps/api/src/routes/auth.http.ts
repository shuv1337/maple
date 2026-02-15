import { HttpApiBuilder } from "@effect/platform"
import { CurrentTenant, MapleApi } from "@maple/domain/http"
import { Effect } from "effect"
import { AuthService } from "../services/AuthService"

export const HttpAuthPublicLive = HttpApiBuilder.group(MapleApi, "authPublic", (handlers) =>
  Effect.gen(function* () {
    return handlers.handle("login", ({ payload }) =>
      AuthService.loginSelfHosted(payload.password),
    )
  }),
)

export const HttpAuthLive = HttpApiBuilder.group(MapleApi, "auth", (handlers) =>
  Effect.gen(function* () {
    return handlers.handle("session", () =>
      Effect.gen(function* () {
        return yield* CurrentTenant.Context
      }),
    )
  }),
)
