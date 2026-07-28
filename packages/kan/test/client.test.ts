import { describe, expect, test } from "bun:test"

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
