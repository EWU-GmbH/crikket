import { describe, expect, test } from "bun:test"

describe("kan client module", () => {
  test("exports createKanCard helpers", async () => {
    const mod = await import("../src/client")
    expect(typeof mod.createKanCard).toBe("function")
    expect(typeof mod.createKanCardInBackground).toBe("function")
    expect(typeof mod.isKanIntegrationEnabled).toBe("function")
  })
})
