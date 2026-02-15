import { HttpApi, OpenApi } from "@effect/platform"
import { AuthApiGroup, AuthPublicApiGroup } from "./auth"
import { DashboardsApiGroup } from "./dashboards"
import { IngestKeysApiGroup } from "./ingest-keys"
import { QueryEngineApiGroup } from "./query-engine"
import { TinybirdApiGroup } from "./tinybird"

export class MapleApi extends HttpApi.make("MapleApi")
  .add(AuthPublicApiGroup)
  .add(AuthApiGroup)
  .add(DashboardsApiGroup)
  .add(IngestKeysApiGroup)
  .add(QueryEngineApiGroup)
  .add(TinybirdApiGroup)
  .annotateContext(
    OpenApi.annotations({
      title: "Maple API",
      version: "1.0.0",
      description: "Effect-based backend API for Maple.",
    }),
  ) {}
