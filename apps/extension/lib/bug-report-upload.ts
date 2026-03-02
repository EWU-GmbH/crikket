import type { BugReportDebuggerPayload } from "@crikket/capture-core/debugger/types"
import type { Priority } from "@crikket/shared/constants/priorities"
import { client } from "./orpc"

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
  metadata?: {
    duration?: string
    durationMs?: number
    pageTitle?: string
  }
  priority: Priority
  title?: string
  url?: string
}): Promise<Awaited<ReturnType<typeof client.bugReport.finalizeUpload>>> {
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
  })

  const debuggerArtifact = await buildDebuggerArtifact(input.debuggerPayload)
  const uploads: Promise<void>[] = [
    uploadArtifact(uploadSession.captureUpload, input.attachment),
  ]

  if (uploadSession.debuggerUpload && debuggerArtifact) {
    uploads.push(
      uploadArtifact(uploadSession.debuggerUpload, debuggerArtifact.blob, {
        contentEncoding: debuggerArtifact.contentEncoding,
      })
    )
  }

  await Promise.all(uploads)

  return client.bugReport.finalizeUpload({
    id: uploadSession.bugReportId,
    captureContentType: input.attachment.type || undefined,
    captureSizeBytes: input.attachment.size,
    debuggerContentEncoding: debuggerArtifact?.contentEncoding,
    debuggerSizeBytes: debuggerArtifact?.blob.size,
  })
}

async function uploadArtifact(
  target: {
    headers: Record<string, string>
    method: "PUT"
    url: string
  },
  blob: Blob,
  options?: { contentEncoding?: string }
): Promise<void> {
  let response: Response

  try {
    response = await fetch(target.url, {
      method: target.method,
      headers: {
        ...target.headers,
        ...(options?.contentEncoding
          ? { "content-encoding": options.contentEncoding }
          : undefined),
      },
      body: blob,
    })
  } catch (error) {
    throw new Error(
      "Direct upload to storage failed before the server responded. Check storage CORS and network access, then retry.",
      {
        cause: error,
      }
    )
  }

  if (!response.ok) {
    throw new Error(`Artifact upload failed with status ${response.status}.`)
  }
}

async function buildDebuggerArtifact(
  payload: BugReportDebuggerPayload | undefined
): Promise<{ blob: Blob; contentEncoding?: string } | null> {
  if (!payload) {
    return null
  }

  const uncompressedBlob = new Blob([JSON.stringify(payload)], {
    type: "application/json",
  })

  if (typeof CompressionStream !== "function") {
    return {
      blob: uncompressedBlob,
      contentEncoding: undefined,
    }
  }

  const compressedStream = uncompressedBlob
    .stream()
    .pipeThrough(new CompressionStream("gzip"))
  const compressedBlob = await new Response(compressedStream).blob()

  return {
    blob: compressedBlob,
    contentEncoding: "gzip",
  }
}
