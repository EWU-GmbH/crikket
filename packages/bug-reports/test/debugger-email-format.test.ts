import { describe, expect, it } from "bun:test"
import { formatDebuggerExcerpt } from "../src/lib/notifications/debugger-email-format"

describe("formatDebuggerExcerpt", () => {
  it("formats steps, console and network", () => {
    const excerpt = formatDebuggerExcerpt({
      actions: [{ type: "click", target: "button.submit" }],
      logs: [{ level: "error", message: "boom" }],
      networkRequests: [
        { method: "GET", url: "https://example.com/api", status: 500, duration: 12 },
      ],
    })

    expect(excerpt.counts).toEqual({
      actions: 1,
      logs: 1,
      networkRequests: 1,
    })
    expect(excerpt.actionsText).toContain("click")
    expect(excerpt.actionsText).toContain("button.submit")
    expect(excerpt.logsText).toContain("[ERROR] boom")
    expect(excerpt.networkText).toContain("GET")
    expect(excerpt.networkText).toContain("500")
  })

  it("notes truncated remainder", () => {
    const excerpt = formatDebuggerExcerpt({
      actions: Array.from({ length: 42 }, (_, index) => ({
        type: "click",
        target: `el-${index}`,
      })),
    })
    expect(excerpt.counts.actions).toBe(42)
    expect(excerpt.actionsText).toContain("und 2 weitere")
  })
})
