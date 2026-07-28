import type { BugReportDebuggerPayload } from "@crikket/capture-core/debugger/types"
import {
  buildDebuggerArtifactForUpload,
  uploadArtifactToStorage,
} from "@crikket/capture-core/upload/client"
import {
  MAX_EXTRA_ATTACHMENT_SIZE_BYTES,
  MAX_EXTRA_ATTACHMENTS_PER_REPORT,
} from "@crikket/shared/constants/bug-report"
import type { Priority } from "@crikket/shared/constants/priorities"
import { client } from "./orpc"

export interface BugReportExtraAttachmentInput {
  clientId: string
  kind: "screenshot" | "file"
  blob: Blob
  filename?: string
}

export async function submitBugReportWithUploads(input: {
  attachment: Blob
  attachmentType: "video" | "screenshot"
  debuggerPayload?: BugReportDebuggerPayload
  debuggerSummary: {
    actions: number
    logs: number
    networkRequests: number
  }
  description?: string
  deviceInfo?: {
    browser?: string
    os?: string
    viewport?: string
  }
  extraAttachments?: BugReportExtraAttachmentInput[]
  metadata?: {
    duration?: string
    durationMs?: number
    pageTitle?: string
  }
  priority: Priority
  title?: string
  url?: string
}): Promise<Awaited<ReturnType<typeof client.bugReport.finalizeUpload>>> {
  const extraAttachments = input.extraAttachments ?? []
  if (extraAttachments.length > MAX_EXTRA_ATTACHMENTS_PER_REPORT) {
    throw new Error(
      `You can attach at most ${MAX_EXTRA_ATTACHMENTS_PER_REPORT} additional files.`
    )
  }

  for (const attachment of extraAttachments) {
    if (attachment.blob.size > MAX_EXTRA_ATTACHMENT_SIZE_BYTES) {
      throw new Error(
        "One or more attachments are too large. Keep each additional file under 25 MB."
      )
    }
  }

  const uploadSession = await client.bugReport.createUpload({
    attachmentType: input.attachmentType,
    captureContentType: input.attachment.type || undefined,
    description: input.description,
    deviceInfo: input.deviceInfo,
    hasDebuggerPayload: Boolean(input.debuggerPayload),
    debuggerSummary: input.debuggerSummary,
    metadata: input.metadata,
    priority: input.priority,
    title: input.title,
    url: input.url,
    visibility: "private",
    extraAttachments:
      extraAttachments.length > 0
        ? extraAttachments.map((attachment) => ({
            clientId: attachment.clientId,
            kind: attachment.kind,
            contentType:
              attachment.blob.type ||
              (attachment.kind === "screenshot"
                ? "image/png"
                : "application/octet-stream"),
            filename: attachment.filename,
          }))
        : undefined,
  })

  const debuggerArtifact = await buildDebuggerArtifactForUpload(
    input.debuggerPayload
  )
  const uploads: Promise<void>[] = [
    uploadArtifactToStorage(uploadSession.captureUpload, input.attachment),
  ]

  for (const attachment of extraAttachments) {
    const uploadTarget = uploadSession.extraAttachmentUploads.find(
      (entry) => entry.clientId === attachment.clientId
    )
    if (!uploadTarget) {
      throw new Error(
        `Missing upload target for attachment ${attachment.clientId}.`
      )
    }
    uploads.push(uploadArtifactToStorage(uploadTarget.upload, attachment.blob))
  }

  if (uploadSession.debuggerUpload && debuggerArtifact) {
    uploads.push(
      uploadArtifactToStorage(
        uploadSession.debuggerUpload,
        debuggerArtifact.blob,
        {
          contentEncoding: debuggerArtifact.contentEncoding,
        }
      )
    )
  }

  await Promise.all(uploads)

  return client.bugReport.finalizeUpload({
    id: uploadSession.bugReportId,
    captureContentType: input.attachment.type || undefined,
    captureSizeBytes: input.attachment.size,
    debuggerContentEncoding: debuggerArtifact?.contentEncoding,
    debuggerSizeBytes: debuggerArtifact?.blob.size,
    extraAttachments: uploadSession.extraAttachmentUploads.map((entry) => {
      const attachment = extraAttachments.find(
        (item) => item.clientId === entry.clientId
      )
      return {
        id: entry.id,
        contentType: attachment?.blob.type || undefined,
        sizeBytes: attachment?.blob.size,
      }
    }),
  })
}
