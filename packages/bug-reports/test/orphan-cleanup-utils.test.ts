import { describe, expect, it } from "bun:test"
import { resolvePendingBugReportUploadSessionArtifactKeys } from "../src/lib/orphan-cleanup-utils"

describe("resolvePendingBugReportUploadSessionArtifactKeys", () => {
  it("returns the staged capture and debugger artifacts", () => {
    const result = resolvePendingBugReportUploadSessionArtifactKeys({
      captureKey: "organizations/org_123/bug-reports/br_123/capture/video.webm",
      debuggerKey:
        "organizations/org_123/bug-reports/br_123/debugger/payload.json.gz",
    })

    expect(result).toEqual({
      captureObjectKey:
        "organizations/org_123/bug-reports/br_123/capture/video.webm",
      debuggerObjectKey:
        "organizations/org_123/bug-reports/br_123/debugger/payload.json.gz",
    })
  })
})
