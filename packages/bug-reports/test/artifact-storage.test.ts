import { describe, expect, it } from "bun:test"
import {
  buildCaptureArtifactKey,
  buildDebuggerArtifactKey,
  buildExtraAttachmentArtifactKey,
  buildThumbnailArtifactKey,
  sanitizeAttachmentFilename,
} from "../src/lib/artifact-storage"

describe("artifact storage key builders", () => {
  it("builds capture keys under the bug report capture folder", () => {
    expect(
      buildCaptureArtifactKey({
        organizationId: "org_123",
        bugReportId: "br_123",
        captureType: "video",
      })
    ).toBe("organizations/org_123/bug-reports/br_123/capture/video.webm")

    expect(
      buildCaptureArtifactKey({
        organizationId: "org_123",
        bugReportId: "br_123",
        captureType: "screenshot",
      })
    ).toBe("organizations/org_123/bug-reports/br_123/capture/screenshot.png")
  })

  it("builds thumbnail keys under the capture folder", () => {
    expect(
      buildThumbnailArtifactKey({
        organizationId: "org_123",
        bugReportId: "br_123",
      })
    ).toBe("organizations/org_123/bug-reports/br_123/capture/thumbnail.png")
  })

  it("builds debugger artifact keys under the debugger folder", () => {
    expect(
      buildDebuggerArtifactKey({
        organizationId: "org_123",
        bugReportId: "br_123",
      })
    ).toBe("organizations/org_123/bug-reports/br_123/debugger/payload.json.gz")
  })

  it("builds extra attachment keys for screenshots and files", () => {
    expect(
      buildExtraAttachmentArtifactKey({
        organizationId: "org_123",
        bugReportId: "br_123",
        attachmentId: "att_1",
        kind: "screenshot",
      })
    ).toBe(
      "organizations/org_123/bug-reports/br_123/attachments/screenshots/att_1.png"
    )

    expect(
      buildExtraAttachmentArtifactKey({
        organizationId: "org_123",
        bugReportId: "br_123",
        attachmentId: "att_2",
        kind: "file",
        filename: "error log.pdf",
      })
    ).toBe(
      "organizations/org_123/bug-reports/br_123/attachments/files/att_2/error-log.pdf"
    )
  })

  it("sanitizes attachment filenames", () => {
    expect(sanitizeAttachmentFilename("../../secret.txt")).toBe("secret.txt")
    expect(sanitizeAttachmentFilename("")).toBe("file")
  })
})
