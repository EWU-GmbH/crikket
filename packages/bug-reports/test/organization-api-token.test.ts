import { describe, expect, it } from "bun:test"

import { hashApiToken } from "../src/lib/api-token-crypto"

describe("hashApiToken", () => {
  it("returns a stable sha256 hex digest", () => {
    const token = "crk_api_exampletokenvalue"
    const first = hashApiToken(token)
    const second = hashApiToken(token)

    expect(first).toBe(second)
    expect(first).toHaveLength(64)
    expect(first).not.toBe(token)
  })

  it("changes when the token changes", () => {
    expect(hashApiToken("crk_api_one")).not.toBe(hashApiToken("crk_api_two"))
  })
})
