import {
  PRIORITY_OPTIONS,
  type Priority,
} from "@crikket/shared/constants/priorities"
import { isExpiringSignedUrl } from "./storage"
import {
  formatDurationMs,
  isAttachmentType,
  isStatus,
  type statusValues,
} from "./utils"

const priorityValues = Object.values(PRIORITY_OPTIONS) as [
  Priority,
  ...Priority[],
]

export interface MyReportedBugReportItem {
  id: string
  title: string
  description: string | undefined
  status: (typeof statusValues)[number]
  priority: Priority
  organizationName: string
  duration: string
  thumbnail: string | undefined
  attachmentUrl: string | undefined
  attachmentType: "video" | "screenshot" | undefined
  createdAt: string
  updatedAt: string
}

export interface MyReportedBugReportRecord {
  id: string
  title: string | null
  description: string | null
  metadata: unknown
  captureKey: string | null
  attachmentType: string | null
  status: string
  priority: string
  createdAt: Date
  updatedAt: Date
  organization: { name: string }
}

function normalizePriority(value: unknown): Priority {
  return priorityValues.includes(value as Priority)
    ? (value as Priority)
    : PRIORITY_OPTIONS.none
}

function normalizeDuration(metadata: Record<string, unknown> | null): string {
  const duration = metadata?.duration
  if (typeof duration === "string" && duration.length > 0) {
    return duration
  }

  const durationMs = metadata?.durationMs
  if (typeof durationMs === "number" && Number.isFinite(durationMs)) {
    return formatDurationMs(Math.max(0, Math.floor(durationMs)))
  }

  return "0:00"
}

/**
 * Maps a reporter-owned bug report into the cross-org "Meine Meldungen" tile
 * payload. Intentionally omits reporter emails and mutation capabilities.
 */
export async function mapMyReportedBugReportItem(input: {
  report: MyReportedBugReportRecord
  resolveCaptureUrl: (args: {
    captureKey: string | null
  }) => Promise<string | null>
}): Promise<MyReportedBugReportItem> {
  const { report } = input
  const metadata = report.metadata as Record<string, unknown> | null
  const attachmentType = isAttachmentType(report.attachmentType)
    ? report.attachmentType
    : undefined
  const attachmentUrl = await input.resolveCaptureUrl({
    captureKey: report.captureKey,
  })
  const thumbnailUrl =
    typeof metadata?.thumbnailUrl === "string" &&
    !isExpiringSignedUrl(metadata.thumbnailUrl)
      ? metadata.thumbnailUrl
      : undefined

  return {
    id: report.id,
    title: report.title || "Untitled Bug Report",
    description: report.description ?? undefined,
    status: isStatus(report.status) ? report.status : "open",
    priority: normalizePriority(report.priority),
    organizationName: report.organization.name,
    duration: normalizeDuration(metadata),
    thumbnail:
      thumbnailUrl ??
      (attachmentType === "screenshot"
        ? (attachmentUrl ?? undefined)
        : undefined),
    attachmentUrl: attachmentUrl ?? undefined,
    attachmentType,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  }
}
