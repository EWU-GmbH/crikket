import {
  buildDebuggerArtifactForUpload,
  type DirectUploadTarget,
  uploadArtifactToStorage,
} from "@crikket/capture-core/upload/client"
import {
  MAX_EXTRA_ATTACHMENT_SIZE_BYTES,
  MAX_EXTRA_ATTACHMENTS_PER_REPORT,
} from "@crikket/shared/constants/bug-report"
import type { CaptureSubmitRequest, CaptureSubmitResult } from "../types"
import { runTurnstileChallenge } from "./turnstile"

const ABSOLUTE_HTTP_URL_REGEX = /^https?:\/\//
const BUG_REPORTS_PATH_SUFFIX = "/bug-reports"
const CAPTURE_CHALLENGE_REQUIRED_CODE = "CAPTURE_CHALLENGE_REQUIRED"
const FILE_SIZE_LIMIT_MESSAGE =
  "This recording is too large to upload reliably. Retry with a shorter recording or a screenshot."
const EXTRA_ATTACHMENT_SIZE_LIMIT_MESSAGE =
  "One or more attachments are too large. Keep each additional file under 25 MB."

export async function defaultSubmitTransport(
  request: CaptureSubmitRequest
): Promise<CaptureSubmitResult> {
  const uploadSessionRequest = buildUploadSessionRequest(request)
  const uploadSessionUrl = `${request.config.host}${resolveUploadSessionPath(
    request.config.submitPath
  )}`
  const finalizeUrl = `${request.config.host}${resolveFinalizePath(
    request.config.submitPath
  )}`
  const submitToken = await fetchCaptureSubmitToken(request)
  const uploadSessionResponse = await fetch(uploadSessionUrl, {
    method: "POST",
    headers: {
      ...(submitToken ? { "x-crikket-capture-token": submitToken } : undefined),
      "content-type": "application/json",
      "x-crikket-public-key": request.config.key,
    },
    body: JSON.stringify(uploadSessionRequest),
    credentials: "omit",
    mode: "cors",
  })

  const uploadSessionPayload = await parseResponsePayload(uploadSessionResponse)
  if (!uploadSessionResponse.ok) {
    throw new Error(
      getResponseErrorMessage(
        uploadSessionPayload,
        uploadSessionResponse.status
      )
    )
  }

  const uploadSession = parseUploadSessionPayload(uploadSessionPayload)
  const extraAttachments = request.report.extraAttachments ?? []
  const uploads: Promise<void>[] = [
    uploadArtifactToStorage(uploadSession.captureUpload, request.report.media),
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

  const debuggerArtifact = await buildDebuggerArtifactForUpload(
    request.report.debuggerPayload
  )
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

  const response = await fetch(finalizeUrl, {
    method: "POST",
    headers: {
      ...(uploadSession.finalizeToken
        ? { "x-crikket-capture-finalize-token": uploadSession.finalizeToken }
        : undefined),
      "content-type": "application/json",
      "x-crikket-public-key": request.config.key,
    },
    body: JSON.stringify({
      id: uploadSession.bugReportId,
      captureContentType:
        request.report.media.type ||
        (request.report.captureType === "screenshot"
          ? "image/png"
          : "video/webm"),
      captureSizeBytes: request.report.media.size,
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
    }),
    credentials: "omit",
    mode: "cors",
  })

  const responsePayload = await parseResponsePayload(response)
  if (!response.ok) {
    throw new Error(getResponseErrorMessage(responsePayload, response.status))
  }

  return {
    shareUrl: resolveShareUrl(
      request.config.host,
      resolveString(responsePayload, ["shareUrl", "url"])
    ),
    reportId: resolveString(responsePayload, ["id", "reportId"]),
    raw: responsePayload,
  }
}

function buildUploadSessionRequest(request: CaptureSubmitRequest): {
  attachmentType: CaptureSubmitRequest["report"]["captureType"]
  captureContentType?: string
  description: string
  debuggerSummary: CaptureSubmitRequest["report"]["debuggerSummary"]
  deviceInfo?: CaptureSubmitRequest["report"]["deviceInfo"]
  extraAttachments?: Array<{
    clientId: string
    contentType: string
    filename?: string
    kind: "screenshot" | "file"
  }>
  hasDebuggerPayload: boolean
  metadata: {
    durationMs?: number
    pageTitle: string
    submittedVia: string
  }
  priority: CaptureSubmitRequest["report"]["priority"]
  title: string
  url: string
  visibility: CaptureSubmitRequest["report"]["visibility"]
} {
  if (request.report.media.size > 95 * 1024 * 1024) {
    throw new Error(FILE_SIZE_LIMIT_MESSAGE)
  }

  const extraAttachments = request.report.extraAttachments ?? []
  if (extraAttachments.length > MAX_EXTRA_ATTACHMENTS_PER_REPORT) {
    throw new Error(
      `You can attach at most ${MAX_EXTRA_ATTACHMENTS_PER_REPORT} additional files.`
    )
  }

  for (const attachment of extraAttachments) {
    if (attachment.blob.size > MAX_EXTRA_ATTACHMENT_SIZE_BYTES) {
      throw new Error(EXTRA_ATTACHMENT_SIZE_LIMIT_MESSAGE)
    }
  }

  return {
    title: request.report.title,
    description: request.report.description,
    priority: request.report.priority,
    visibility: request.report.visibility,
    attachmentType: request.report.captureType,
    url: request.report.pageUrl,
    metadata: {
      durationMs: request.report.durationMs ?? undefined,
      pageTitle: request.report.pageTitle,
      submittedVia: "capture-sdk",
    },
    deviceInfo: request.report.deviceInfo,
    captureContentType: request.report.media.type || undefined,
    debuggerSummary: request.report.debuggerSummary,
    hasDebuggerPayload: Boolean(request.report.debuggerPayload),
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
  }
}

async function fetchCaptureSubmitToken(
  request: CaptureSubmitRequest
): Promise<string | undefined> {
  const tokenUrl = `${request.config.host}${resolveCaptureTokenPath(
    request.config.submitPath
  )}`
  let turnstileToken: string | undefined

  for (const _attempt of [0, 1] as const) {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-crikket-public-key": request.config.key,
      },
      body: JSON.stringify(
        turnstileToken ? { turnstileToken } : { turnstileToken: undefined }
      ),
      credentials: "omit",
      mode: "cors",
    })

    if (
      response.status === 404 ||
      response.status === 405 ||
      response.status === 501
    ) {
      return undefined
    }

    const responsePayload = await parseResponsePayload(response)
    if (response.ok) {
      return resolveString(responsePayload, ["token"])
    }

    const challenge = resolveChallenge(responsePayload)
    if (
      isChallengeRequired(responsePayload) &&
      challenge?.provider === "turnstile" &&
      challenge.siteKey &&
      !turnstileToken
    ) {
      turnstileToken = await runTurnstileChallenge(challenge.siteKey)
      continue
    }

    throw new Error(getResponseErrorMessage(responsePayload, response.status))
  }

  throw new Error("Anti-bot verification could not be completed.")
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    return undefined
  }

  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function getResponseErrorMessage(payload: unknown, status: number): string {
  if (!isRecord(payload)) {
    return `Capture submission failed with status ${status}.`
  }

  const message = resolveString(payload, ["message", "error"])
  return message ?? `Capture submission failed with status ${status}.`
}

function isChallengeRequired(payload: unknown): boolean {
  return isRecord(payload) && payload.code === CAPTURE_CHALLENGE_REQUIRED_CODE
}

function resolveChallenge(
  payload: unknown
): { provider?: string; siteKey?: string } | undefined {
  if (!isRecord(payload)) {
    return undefined
  }

  const challenge = payload.challenge
  if (!isRecord(challenge)) {
    return undefined
  }

  return {
    provider:
      typeof challenge.provider === "string" ? challenge.provider : undefined,
    siteKey:
      typeof challenge.siteKey === "string" ? challenge.siteKey : undefined,
  }
}

function resolveString(
  payload: unknown,
  keys: readonly string[]
): string | undefined {
  if (!isRecord(payload)) {
    return undefined
  }

  for (const key of keys) {
    const candidate = payload[key]
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate
    }
  }

  const nestedReport = payload.report
  if (!isRecord(nestedReport)) {
    return undefined
  }

  for (const key of keys) {
    const candidate = nestedReport[key]
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate
    }
  }

  return undefined
}

function resolveShareUrl(
  host: string,
  shareUrl: string | undefined
): string | undefined {
  if (!shareUrl) {
    return undefined
  }

  if (ABSOLUTE_HTTP_URL_REGEX.test(shareUrl)) {
    return shareUrl
  }

  return `${host}${shareUrl.startsWith("/") ? shareUrl : `/${shareUrl}`}`
}

function resolveCaptureTokenPath(submitPath: string): string {
  const normalizedSubmitPath = submitPath.endsWith("/")
    ? submitPath.slice(0, -1)
    : submitPath

  if (normalizedSubmitPath.endsWith(BUG_REPORTS_PATH_SUFFIX)) {
    return `${normalizedSubmitPath.slice(0, -BUG_REPORTS_PATH_SUFFIX.length)}/capture-token`
  }

  return `${normalizedSubmitPath}/token`
}

function resolveUploadSessionPath(submitPath: string): string {
  const normalizedSubmitPath = submitPath.endsWith("/")
    ? submitPath.slice(0, -1)
    : submitPath

  if (normalizedSubmitPath.endsWith(BUG_REPORTS_PATH_SUFFIX)) {
    return `${normalizedSubmitPath.slice(0, -BUG_REPORTS_PATH_SUFFIX.length)}/bug-report-upload-session`
  }

  return `${normalizedSubmitPath}/upload-session`
}

function resolveFinalizePath(submitPath: string): string {
  const normalizedSubmitPath = submitPath.endsWith("/")
    ? submitPath.slice(0, -1)
    : submitPath

  if (normalizedSubmitPath.endsWith(BUG_REPORTS_PATH_SUFFIX)) {
    return `${normalizedSubmitPath.slice(0, -BUG_REPORTS_PATH_SUFFIX.length)}/bug-report-finalize`
  }

  return `${normalizedSubmitPath}/finalize`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseUploadSessionPayload(payload: unknown): {
  bugReportId: string
  captureUpload: DirectUploadTarget
  debuggerUpload?: DirectUploadTarget
  extraAttachmentUploads: Array<{
    clientId: string
    id: string
    upload: DirectUploadTarget
  }>
  finalizeToken?: string
} {
  if (!isRecord(payload)) {
    throw new Error("Capture upload session response was invalid.")
  }

  const bugReportId =
    typeof payload.bugReportId === "string" ? payload.bugReportId : undefined
  if (!bugReportId) {
    throw new Error("Capture upload session response was missing bugReportId.")
  }

  const extraAttachmentUploads = Array.isArray(payload.extraAttachmentUploads)
    ? payload.extraAttachmentUploads.map((entry) => {
        if (!isRecord(entry) || typeof entry.clientId !== "string") {
          throw new Error("Capture extra attachment upload target was invalid.")
        }

        return {
          clientId: entry.clientId,
          id: typeof entry.id === "string" ? entry.id : entry.clientId,
          upload: parseUploadTarget(entry.upload),
        }
      })
    : []

  return {
    bugReportId,
    captureUpload: parseUploadTarget(payload.captureUpload),
    debuggerUpload: payload.debuggerUpload
      ? parseUploadTarget(payload.debuggerUpload)
      : undefined,
    extraAttachmentUploads,
    finalizeToken:
      typeof payload.finalizeToken === "string"
        ? payload.finalizeToken
        : undefined,
  }
}

function parseUploadTarget(value: unknown): DirectUploadTarget {
  if (
    !isRecord(value) ||
    value.method !== "PUT" ||
    typeof value.url !== "string"
  ) {
    throw new Error("Capture upload target response was invalid.")
  }

  const headers = isRecord(value.headers)
    ? Object.fromEntries(
        Object.entries(value.headers).filter(
          (entry): entry is [string, string] => {
            return typeof entry[1] === "string"
          }
        )
      )
    : {}

  return {
    url: value.url,
    method: "PUT",
    headers,
  }
}
