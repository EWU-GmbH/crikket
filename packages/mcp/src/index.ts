import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { createCrikketClient } from "./client"
import { createCrikketMcpServer } from "./server"

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export async function startCrikketMcpServer(): Promise<void> {
  const apiToken = requireEnv("CRIKKET_API_TOKEN")
  const serverUrl =
    process.env.CRIKKET_SERVER_URL?.trim() || "https://api.crikket.io"

  const client = createCrikketClient({
    apiToken,
    serverUrl,
  })
  const server = createCrikketMcpServer(client)
  const transport = new StdioServerTransport()
  await server.connect(transport)
}

export { createCrikketClient } from "./client"
export { compressDebuggerContext } from "./compress"
export { createCrikketMcpServer } from "./server"
