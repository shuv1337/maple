import {
  optionalBooleanParam,
  optionalNumberParam,
  optionalStringParam,
  requiredStringParam,
  type McpToolRegistrar,
} from "./types"
import { queryTinybird } from "../lib/query-tinybird"
import { formatDurationFromMs, truncate } from "../lib/format"

interface SpanNode {
  spanId: string
  parentSpanId: string
  spanName: string
  serviceName: string
  durationMs: number
  statusCode: string
  statusMessage: string
  children: SpanNode[]
}

export function registerInspectTraceTool(server: McpToolRegistrar) {
  server.tool(
    "inspect_trace",
    "Deep-dive into a trace: shows the full span tree with durations and status, plus correlated logs.",
    {
      trace_id: requiredStringParam("The trace ID to inspect"),
    },
    async ({ trace_id }) => {
      try {
        const [spansResult, logsResult] = await Promise.all([
          queryTinybird("span_hierarchy", { trace_id }),
          queryTinybird("list_logs", { trace_id, limit: 50 }),
        ])

        const spans = spansResult.data
        if (spans.length === 0) {
          return { content: [{ type: "text", text: `No spans found for trace ${trace_id}` }] }
        }

        // Build span tree
        const nodeMap = new Map<string, SpanNode>()
        const roots: SpanNode[] = []

        for (const span of spans) {
          nodeMap.set(span.spanId, {
            spanId: span.spanId,
            parentSpanId: span.parentSpanId,
            spanName: span.spanName,
            serviceName: span.serviceName,
            durationMs: span.durationMs,
            statusCode: span.statusCode,
            statusMessage: span.statusMessage,
            children: [],
          })
        }

        for (const node of nodeMap.values()) {
          if (node.parentSpanId && nodeMap.has(node.parentSpanId)) {
            nodeMap.get(node.parentSpanId)!.children.push(node)
          } else {
            roots.push(node)
          }
        }

        // Compute trace-level stats
        const serviceSet = new Set(spans.map((s) => s.serviceName))
        const rootDuration = roots[0]?.durationMs ?? 0

        const lines: string[] = [
          `=== Trace ${trace_id} (${serviceSet.size} services, ${spans.length} spans, ${formatDurationFromMs(rootDuration)}) ===`,
          ``,
        ]

        // Render tree
        function renderNode(node: SpanNode, prefix: string, isLast: boolean) {
          const connector = prefix === "" ? "" : isLast ? "└── " : "├── "
          const status = node.statusCode === "Error" ? " [Error]" : node.statusCode === "Ok" ? " [Ok]" : ""
          lines.push(
            `${prefix}${connector}${node.spanName} — ${node.serviceName} (${formatDurationFromMs(node.durationMs)})${status}`,
          )
          if (node.statusCode === "Error" && node.statusMessage) {
            const childPrefix = prefix + (prefix === "" ? "" : isLast ? "    " : "│   ")
            lines.push(`${childPrefix}    Status: "${truncate(node.statusMessage, 100)}"`)
          }
          const childPrefix = prefix + (prefix === "" ? "" : isLast ? "    " : "│   ")
          node.children.forEach((child, i) => {
            renderNode(child, childPrefix, i === node.children.length - 1)
          })
        }

        for (const root of roots) {
          renderNode(root, "", true)
        }

        // Related logs
        const logs = logsResult.data
        if (logs.length > 0) {
          lines.push(``, `Related Logs (${logs.length}):`)
          for (const log of logs.slice(0, 20)) {
            const ts = String(log.timestamp)
            const time = ts.split(" ")[1] ?? ts
            const sev = (log.severityText || "INFO").padEnd(5)
            const svc = log.serviceName
            const body = truncate(log.body, 100)
            lines.push(`  ${time} [${sev}] ${svc}: ${body}`)
          }
          if (logs.length > 20) {
            lines.push(`  ... and ${logs.length - 20} more logs`)
          }
        }

        return { content: [{ type: "text", text: lines.join("\n") }] }
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        }
      }
    },
  )
}
