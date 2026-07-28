import {
  BUG_REPORT_EXTRA_ATTACHMENT_KIND_VALUES,
  type BugReportExtraAttachmentKind,
} from "@crikket/shared/constants/bug-report"
import { z } from "zod"

export {
  MAX_EXTRA_ATTACHMENT_SIZE_BYTES,
  MAX_EXTRA_ATTACHMENTS_PER_REPORT,
} from "@crikket/shared/constants/bug-report"

const bugReportArtifactKindValues = [
  "capture",
  "thumbnail",
  "debugger",
  "attachment",
] as const

const UNSAFE_FILENAME_CHARS_REGEX = /[^a-zA-Z0-9._-]+/g
const REPEATED_DASH_REGEX = /-+/g
const LEADING_DOTS_REGEX = /^\.+/

export const bugReportArtifactKindSchema = z.enum(bugReportArtifactKindValues)

export type BugReportArtifactKind = z.infer<typeof bugReportArtifactKindSchema>

export const EXTRA_ATTACHMENT_KIND_VALUES =
  BUG_REPORT_EXTRA_ATTACHMENT_KIND_VALUES
export type ExtraAttachmentKind = BugReportExtraAttachmentKind

export function buildCaptureArtifactKey(input: {
  organizationId: string
  bugReportId: string
  captureType: "video" | "screenshot"
}): string {
  return (
    buildBugReportArtifactBasePath(input) +
    getCaptureFilename(input.captureType)
  )
}

export function buildThumbnailArtifactKey(input: {
  organizationId: string
  bugReportId: string
}): string {
  return `${buildBugReportArtifactBasePath(input)}thumbnail.png`
}

export function buildDebuggerArtifactKey(input: {
  organizationId: string
  bugReportId: string
}): string {
  const basePath = buildBugReportBasePath(input)
  return `${basePath}/debugger/payload.json.gz`
}

export function buildExtraAttachmentArtifactKey(input: {
  organizationId: string
  bugReportId: string
  attachmentId: string
  kind: ExtraAttachmentKind
  filename?: string | null
}): string {
  const basePath = buildBugReportBasePath(input)

  if (input.kind === "screenshot") {
    return `${basePath}/attachments/screenshots/${input.attachmentId}.png`
  }

  const safeFilename = sanitizeAttachmentFilename(input.filename ?? "file")
  return `${basePath}/attachments/files/${input.attachmentId}/${safeFilename}`
}

export function sanitizeAttachmentFilename(filename: string): string {
  const trimmed = filename.trim().replaceAll("\\", "/").split("/").pop() ?? ""
  const withoutControlChars = Array.from(trimmed)
    .filter((char) => {
      const code = char.charCodeAt(0)
      return code >= 32 && code !== 127
    })
    .join("")
  const sanitized = withoutControlChars
    .replace(UNSAFE_FILENAME_CHARS_REGEX, "-")
    .replace(REPEATED_DASH_REGEX, "-")
    .replace(LEADING_DOTS_REGEX, "")
    .slice(0, 180)

  return sanitized.length > 0 ? sanitized : "file"
}

function buildBugReportArtifactBasePath(input: {
  organizationId: string
  bugReportId: string
}): string {
  const basePath = buildBugReportBasePath(input)
  return `${basePath}/capture/`
}

function buildBugReportBasePath(input: {
  organizationId: string
  bugReportId: string
}): string {
  return `organizations/${input.organizationId}/bug-reports/${input.bugReportId}`
}

function getCaptureFilename(captureType: "video" | "screenshot"): string {
  return captureType === "video" ? "video.webm" : "screenshot.png"
}
