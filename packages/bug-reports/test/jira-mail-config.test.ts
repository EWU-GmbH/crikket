import { describe, expect, it } from "bun:test"
import { parseJiraMailOrgJson } from "../src/lib/notifications/jira-mail-config-parse"

describe("parseJiraMailOrgJson", () => {
  it("returns null for empty input", () => {
    expect(parseJiraMailOrgJson(undefined)).toBeNull()
    expect(parseJiraMailOrgJson("")).toBeNull()
    expect(parseJiraMailOrgJson("   ")).toBeNull()
  })

  it("parses organization mailboxes", () => {
    expect(
      parseJiraMailOrgJson(
        '{"GPzv0OTEZZ0Xo3etWUfDoeZu2kwsNd0t":"eut@ewu-software.atlassian.net"}'
      )
    ).toEqual({
      GPzv0OTEZZ0Xo3etWUfDoeZu2kwsNd0t: "eut@ewu-software.atlassian.net",
    })
  })

  it("skips invalid emails and empty objects", () => {
    expect(parseJiraMailOrgJson('{"org":"not-an-email"}')).toBeNull()
    expect(parseJiraMailOrgJson("[]")).toBeNull()
    expect(parseJiraMailOrgJson("{")).toBeNull()
  })
})
