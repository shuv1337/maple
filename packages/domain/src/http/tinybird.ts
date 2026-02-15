import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"
import { tinybirdPipes } from "../tinybird-pipes"
import { Authorization } from "./current-tenant"

export { UnauthorizedError } from "./current-tenant"

const TinybirdPipeSchema = Schema.Literal(...tinybirdPipes)

const UnknownRecord = Schema.Record({
  key: Schema.String,
  value: Schema.Unknown,
})

export class TinybirdQueryRequest extends Schema.Class<TinybirdQueryRequest>("TinybirdQueryRequest")({
  pipe: TinybirdPipeSchema,
  params: Schema.optional(UnknownRecord),
}) {}

export class TinybirdQueryResponse extends Schema.Class<TinybirdQueryResponse>("TinybirdQueryResponse")({
  data: Schema.Array(Schema.Unknown),
}) {}

export class TinybirdQueryError extends Schema.TaggedError<TinybirdQueryError>()(
  "TinybirdQueryError",
  {
    message: Schema.String,
    pipe: TinybirdPipeSchema,
  },
  HttpApiSchema.annotations({ status: 502 }),
) {}

export class TinybirdApiGroup extends HttpApiGroup.make("tinybird")
  .add(
    HttpApiEndpoint.post("query", "/query")
      .setPayload(TinybirdQueryRequest)
      .addSuccess(TinybirdQueryResponse)
      .addError(TinybirdQueryError),
  )
  .prefix("/api/tinybird")
  .middleware(Authorization) {}
