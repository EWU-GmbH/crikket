#!/usr/bin/env bun

import { startCrikketMcpServer } from "./index"

startCrikketMcpServer().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[crikket-mcp] ${message}`)
  process.exit(1)
})
