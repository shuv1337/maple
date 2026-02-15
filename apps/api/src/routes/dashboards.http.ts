import { HttpApiBuilder } from "@effect/platform"
import {
  CurrentTenant,
  DashboardValidationError,
  MapleApi,
} from "@maple/domain/http"
import { Effect } from "effect"
import { DashboardPersistenceService } from "../services/DashboardPersistenceService"

export const HttpDashboardsLive = HttpApiBuilder.group(
  MapleApi,
  "dashboards",
  (handlers) =>
    Effect.gen(function* () {
      const persistence = yield* DashboardPersistenceService

      return handlers
        .handle("list", () =>
          Effect.gen(function* () {
            const tenant = yield* CurrentTenant.Context
            const dashboards = yield* persistence.list(tenant.orgId)

            return {
              dashboards,
            }
          }),
        )
        .handle("upsert", ({ path, payload }) =>
          Effect.gen(function* () {
            if (path.dashboardId !== payload.dashboard.id) {
              return yield* Effect.fail(
                new DashboardValidationError({
                  message: "Dashboard ID mismatch",
                  details: [
                    "Path dashboardId must match payload.dashboard.id",
                  ],
                }),
              )
            }

            const tenant = yield* CurrentTenant.Context
            return yield* persistence.upsert(
              tenant.orgId,
              tenant.userId,
              payload.dashboard,
            )
          }),
        )
        .handle("delete", ({ path }) =>
          Effect.gen(function* () {
            const tenant = yield* CurrentTenant.Context
            return yield* persistence.delete(tenant.orgId, path.dashboardId)
          }),
        )
    }),
)
