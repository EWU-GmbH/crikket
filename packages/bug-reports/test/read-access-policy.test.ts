import { describe, expect, it } from "bun:test"
import { shouldExposeBugReportToViewer } from "../src/lib/read-access-policy"

describe("shouldExposeBugReportToViewer", () => {
  it("allows ready reports for external viewers", () => {
    expect(
      shouldExposeBugReportToViewer({
        canAccessUnready: false,
        submissionStatus: "ready",
      })
    ).toBeTrue()
  })

  it("hides non-ready reports from external viewers", () => {
    expect(
      shouldExposeBugReportToViewer({
        canAccessUnready: false,
        submissionStatus: "failed",
      })
    ).toBeFalse()
  })

  it("allows internal viewers to inspect non-ready reports", () => {
    expect(
      shouldExposeBugReportToViewer({
        canAccessUnready: true,
        submissionStatus: "failed",
      })
    ).toBeTrue()
  })
})
