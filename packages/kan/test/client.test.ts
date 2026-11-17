import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test"

const envState: Record<string, string | undefined> = {}

mock.module("@crikket/env/server", () => ({
  env: envState,
}))

afterAll(() => {
  mock.restore()
})

beforeEach(() => {
  for (const key of Object.keys(envState)) {
    delete envState[key]
  }
})

describe("kan client module", () => {
  test("exports createKanCard helpers", async () => {
    const mod = await import("../src/client")
    expect(typeof mod.createKanCard).toBe("function")
    expect(typeof mod.createKanCardInBackground).toBe("function")
    expect(typeof mod.isKanIntegrationEnabled).toBe("function")
    expect(typeof mod.getKanListPublicIdForOrganization).toBe("function")
  })

  test("falls back to global list ids without org mapping", async () => {
    const mod = await import("../src/client")
    expect(
      mod.getKanListPublicIdForOrganization({
        kind: "bugs",
        organizationId: "unknown-org",
      })
    ).toBe(mod.getKanBugsListPublicId())
    expect(
      mod.getKanListPublicIdForOrganization({
        kind: "featureRequests",
        organizationId: "unknown-org",
      })
    ).toBe(mod.getKanFeatureRequestsListPublicId())
  })
})

describe("getKanCardUrl", () => {
  test("builds the card url from KAN_BASE_URL", async () => {
    envState.KAN_BASE_URL = "https://kan.example.test"
    const { getKanCardUrl } = await import("../src/client")

    expect(getKanCardUrl("abc123def456")).toBe(
      "https://kan.example.test/cards/abc123def456"
    )
  })

  test("strips trailing slashes from KAN_BASE_URL", async () => {
    envState.KAN_BASE_URL = "https://kan.example.test///"
    const { getKanCardUrl } = await import("../src/client")

    expect(getKanCardUrl("abc123def456")).toBe(
      "https://kan.example.test/cards/abc123def456"
    )
  })

  test("returns null without KAN_BASE_URL", async () => {
    const { getKanCardUrl } = await import("../src/client")

    expect(getKanCardUrl("abc123def456")).toBeNull()

    envState.KAN_BASE_URL = "   "
    expect(getKanCardUrl("abc123def456")).toBeNull()
  })

  test("returns null for an empty card id", async () => {
    envState.KAN_BASE_URL = "https://kan.example.test"
    const { getKanCardUrl } = await import("../src/client")

    expect(getKanCardUrl("   ")).toBeNull()
  })

  test("trims and url-encodes the card id", async () => {
    envState.KAN_BASE_URL = "https://kan.example.test"
    const { getKanCardUrl } = await import("../src/client")

    expect(getKanCardUrl("  a/b c?d#e  ")).toBe(
      "https://kan.example.test/cards/a%2Fb%20c%3Fd%23e"
    )
  })
})
