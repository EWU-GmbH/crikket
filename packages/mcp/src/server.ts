import type { AppRouterClient } from "@crikket/api/routers/index"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { compressDebuggerContext } from "./compress"

function textResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text:
          typeof payload === "string"
            ? payload
            : JSON.stringify(payload, null, 2),
      },
    ],
  }
}

function errorResult(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Unknown MCP tool error"
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ error: message }, null, 2),
      },
    ],
    isError: true as const,
  }
}

export function createCrikketMcpServer(client: AppRouterClient): McpServer {
  const server = new McpServer({
    name: "crikket",
    version: "0.1.0",
  })

  server.tool(
    "list_bug_reports",
    "List bug reports for the authenticated Crikket organization. Supports search and status filters.",
    {
      page: z.number().int().positive().optional(),
      perPage: z.number().int().positive().max(50).optional(),
      priorities: z
        .array(z.enum(["none", "low", "medium", "high", "critical"]))
        .optional(),
      search: z.string().max(200).optional(),
      statuses: z
        .array(z.enum(["open", "in_progress", "resolved", "closed"]))
        .optional(),
    },
    async (input) => {
      try {
        const result = await client.bugReport.list({
          page: input.page,
          perPage: input.perPage ?? 20,
          priorities: input.priorities,
          search: input.search,
          statuses: input.statuses,
        })
        return textResult(result)
      } catch (error) {
        return errorResult(error)
      }
    }
  )

  server.tool(
    "get_bug_report",
    "Get a single Crikket bug report by id, including description, device info, status, and attachment metadata.",
    {
      id: z.string().min(1),
    },
    async (input) => {
      try {
        const report = await client.bugReport.getById({ id: input.id })
        return textResult(report)
      } catch (error) {
        return errorResult(error)
      }
    }
  )

  server.tool(
    "get_bug_report_context",
    "Get compressed debugger context for a bug report: prioritized console logs, recent user actions, and failed/recent network requests.",
    {
      actionsLimit: z.number().int().positive().max(100).optional(),
      id: z.string().min(1),
      includeNetwork: z.boolean().optional(),
      logsLimit: z.number().int().positive().max(100).optional(),
      networkLimit: z.number().int().positive().max(50).optional(),
    },
    async (input) => {
      try {
        const includeNetwork = input.includeNetwork ?? true
        const [events, network] = await Promise.all([
          client.bugReport.getDebuggerEvents({ id: input.id }),
          includeNetwork
            ? client.bugReport.getNetworkRequests({
                id: input.id,
                page: 1,
                perPage: input.networkLimit ?? 20,
              })
            : Promise.resolve({ items: [], pagination: null }),
        ])

        return textResult(
          compressDebuggerContext({
            actionsLimit: input.actionsLimit,
            events,
            logsLimit: input.logsLimit,
            networkItems: network.items.map((item) => ({
              duration: item.duration ?? null,
              id: item.id,
              method: item.method,
              status: item.status ?? null,
              timestamp: item.timestamp,
              url: item.url,
            })),
            networkLimit: input.networkLimit,
          })
        )
      } catch (error) {
        return errorResult(error)
      }
    }
  )

  server.tool(
    "update_bug_report",
    "Update status, priority, title, visibility, or tags on a Crikket bug report. Requires bug-reports:write scope.",
    {
      id: z.string().min(1),
      priority: z
        .enum(["none", "low", "medium", "high", "critical"])
        .optional(),
      status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
      tags: z.array(z.string().min(1).max(40)).max(20).optional(),
      title: z.string().min(1).max(200).optional(),
      visibility: z.enum(["public", "private"]).optional(),
    },
    async (input) => {
      try {
        const result = await client.bugReport.update({
          id: input.id,
          priority: input.priority,
          status: input.status,
          tags: input.tags,
          title: input.title,
          visibility: input.visibility,
        })
        return textResult(result)
      } catch (error) {
        return errorResult(error)
      }
    }
  )

  return server
}
