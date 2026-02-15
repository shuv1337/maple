import { HttpLayerRouter } from "@effect/platform"
import { McpServer } from "@effect/ai"
import { Layer } from "effect"
import { McpToolsLive } from "./server"

const McpLive = Layer.mergeAll(
  McpToolsLive,
  HttpLayerRouter.cors({
    allowedOrigins: ["*"],
    allowedMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Accept",
      "Mcp-Session-Id",
      "Authorization",
      "X-API-Key",
      "X-Maple-Org-Id",
      "X-Maple-User-Id",
      "X-Maple-Roles",
      "X-Clerk-User-Id",
      "X-Clerk-Org-Id",
      "X-Clerk-Org-Role",
    ],
    exposedHeaders: ["Mcp-Session-Id"],
  }),
).pipe(
  Layer.provideMerge(
    McpServer.layerHttpRouter({
      name: "maple-observability",
      version: "1.0.0",
      path: "/mcp",
    }),
  ),
)

export const mcpWebHandler = HttpLayerRouter.toWebHandler(McpLive, {
  disableLogger: true,
})
