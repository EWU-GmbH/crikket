import type { AppRouterClient } from "@crikket/api/routers/index"
import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"

export type McpClientConfig = {
  apiToken: string
  serverUrl: string
}

const TRAILING_SLASH_PATTERN = /\/$/

export function createCrikketClient(config: McpClientConfig): AppRouterClient {
  const baseUrl = config.serverUrl.replace(TRAILING_SLASH_PATTERN, "")

  const link = new RPCLink({
    url: `${baseUrl}/rpc`,
    headers: () => ({
      Authorization: `Bearer ${config.apiToken}`,
    }),
  })

  return createORPCClient(link)
}
