import { describe, expect, it } from "bun:test"

import { compressDebuggerContext } from "../src/compress"

describe("compressDebuggerContext", () => {
  it("prioritizes error and warn logs and truncates long messages", () => {
    const longMessage = "x".repeat(600)
    const result = compressDebuggerContext({
      events: {
        actions: [
          {
            id: "a1",
            metadata: null,
            offset: 10,
            target: "button",
            timestamp: "2026-01-01T00:00:00.000Z",
            type: "click",
          },
        ],
        logs: [
          {
            id: "l1",
            level: "info",
            message: "hello",
            metadata: null,
            offset: 1,
            timestamp: "2026-01-01T00:00:01.000Z",
          },
          {
            id: "l2",
            level: "error",
            message: longMessage,
            metadata: null,
            offset: 2,
            timestamp: "2026-01-01T00:00:02.000Z",
          },
          {
            id: "l3",
            level: "warn",
            message: "careful",
            metadata: null,
            offset: 3,
            timestamp: "2026-01-01T00:00:03.000Z",
          },
        ],
      },
      logsLimit: 2,
      networkItems: [
        {
          duration: 12,
          id: "n1",
          method: "GET",
          status: 500,
          timestamp: "2026-01-01T00:00:04.000Z",
          url: "https://example.com/api",
        },
      ],
    })

    expect(result.logs).toHaveLength(2)
    expect(result.logs[0]?.level).toBe("error")
    expect(result.logs[0]?.message.endsWith("…")).toBe(true)
    expect(result.logs[1]?.level).toBe("warn")
    expect(result.summary.errorLogCount).toBe(1)
    expect(result.networkRequests).toHaveLength(1)
  })
})
