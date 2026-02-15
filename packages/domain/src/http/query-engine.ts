import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema } from "@effect/platform"
import { Schema } from "effect"
import { QueryEngineExecuteRequest, QueryEngineExecuteResponse } from "../query-engine"
import { tinybirdPipes } from "../tinybird-pipes"
import { Authorization } from "./current-tenant"

const TinybirdPipeSchema = Schema.Literal(...tinybirdPipes)

export class QueryEngineValidationError extends Schema.TaggedError<QueryEngineValidationError>()(
  "QueryEngineValidationError",
  {
    message: Schema.String,
    details: Schema.Array(Schema.String),
  },
  HttpApiSchema.annotations({ status: 400 }),
) {}

export class QueryEngineExecutionError extends Schema.TaggedError<QueryEngineExecutionError>()(
  "QueryEngineExecutionError",
  {
    message: Schema.String,
    causeTag: Schema.optional(Schema.String),
    pipe: Schema.optional(TinybirdPipeSchema),
  },
  HttpApiSchema.annotations({ status: 502 }),
) {}

export class QueryEngineApiGroup extends HttpApiGroup.make("queryEngine")
  .add(
    HttpApiEndpoint.post("execute", "/execute")
      .setPayload(QueryEngineExecuteRequest)
      .addSuccess(QueryEngineExecuteResponse)
      .addError(QueryEngineValidationError)
      .addError(QueryEngineExecutionError),
  )
  .prefix("/api/query-engine")
  .middleware(Authorization) {}
