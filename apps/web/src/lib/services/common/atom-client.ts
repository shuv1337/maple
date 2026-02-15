import { AtomHttpApi } from "@effect-atom/atom-react"
import * as HttpClient from "@effect/platform/HttpClient"
import { MapleApi } from "@maple/domain/http"
import { apiBaseUrl } from "./api-base-url"
import { MapleFetchHttpClientLive } from "./http-client"

export class MapleApiAtomClient extends AtomHttpApi.Tag<MapleApiAtomClient>()(
  "MapleApiAtomClient",
  {
    api: MapleApi,
    httpClient: MapleFetchHttpClientLive as any,
    baseUrl: apiBaseUrl,
    transformClient: (client) =>
      client.pipe(
        HttpClient.retry({
          times: 3,
          while: (error) => {
            if (error._tag === "ResponseError") {
              const status = error.response.status
              return status >= 500 && status < 600
            }

            return error._tag === "RequestError"
          },
        }),
      ),
  },
) {}
