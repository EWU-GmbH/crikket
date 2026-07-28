import { db } from "@crikket/db"
import { env } from "@crikket/env/server"
import {
  bugReport,
  bugReportAttachment,
  bugReportUploadSession,
  bugReportUploadSessionAttachment,
} from "@crikket/db/schema/bug-report"
import {
  BUG_REPORT_DEBUGGER_INGESTION_STATUS_OPTIONS,
  BUG_REPORT_SUBMISSION_STATUS_OPTIONS,
} from "@crikket/shared/constants/bug-report"
import {
  PRIORITY_OPTIONS,
  type Priority,
} from "@crikket/shared/constants/priorities"
import { retryOnUniqueViolation } from "@crikket/shared/lib/server/retry-on-unique-violation"
import { ORPCError } from "@orpc/server"
import { and, asc, eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { z } from "zod"
import {
  buildCaptureArtifactKey,
  buildDebuggerArtifactKey,
  buildExtraAttachmentArtifactKey,
  EXTRA_ATTACHMENT_KIND_VALUES,
  type ExtraAttachmentKind,
  MAX_EXTRA_ATTACHMENT_SIZE_BYTES,
  MAX_EXTRA_ATTACHMENTS_PER_REPORT,
} from "./artifact-storage"
import type { PersistBugReportDebuggerDataResult } from "./debugger"
import {
  assertCreateBugReportEntitlements,
  type CreateBugReportEntitlementInput,
} from "./entitlements"
import {
  processBugReportIngestionJob,
  queueBugReportIngestionJob,
} from "./ingestion-jobs"
import { notifyOwnersAboutNewSubmissionInBackground } from "./notifications/notify-new-report"
import { getStorageProvider } from "./storage"
import {
  buildFallbackTitle,
  formatDurationMs,
  metadataInputSchema,
  optionalText,
  visibilityValues,
} from "./utils"

const priorityValues = Object.values(PRIORITY_OPTIONS) as [
  Priority,
  ...Priority[],
]

const MAX_CONTENT_TYPE_LENGTH = 120
const MAX_CONTENT_ENCODING_LENGTH = 40
const MAX_FILENAME_LENGTH = 255
const MAX_CLIENT_ID_LENGTH = 64
const BUG_REPORT_UPLOAD_SESSION_TTL_MS = 24 * 60 * 60 * 1000

const debuggerSummarySchema = z.object({
  actions: z.number().int().nonnegative(),
  logs: z.number().int().nonnegative(),
  networkRequests: z.number().int().nonnegative(),
})

const extraAttachmentInputSchema = z
  .object({
    clientId: z.string().trim().min(1).max(MAX_CLIENT_ID_LENGTH),
    kind: z.enum(EXTRA_ATTACHMENT_KIND_VALUES),
    contentType: z.string().trim().min(1).max(MAX_CONTENT_TYPE_LENGTH),
    filename: z.string().trim().min(1).max(MAX_FILENAME_LENGTH).optional(),
    sortOrder: z.number().int().nonnegative().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "file" && !value.filename) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "filename is required for file attachments.",
        path: ["filename"],
      })
    }

    if (
      value.kind === "screenshot" &&
      !value.contentType.startsWith("image/")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "screenshot attachments must use an image content type.",
        path: ["contentType"],
      })
    }
  })

export const createBugReportUploadSessionInputSchema = z.object({
  title: optionalText(200),
  description: optionalText(3000),
  priority: z.enum(priorityValues).default(PRIORITY_OPTIONS.none),
  reporterEmail: z.email().trim().max(320).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  url: z.string().url().optional(),
  attachmentType: z.enum(["video", "screenshot"]),
  visibility: z.enum(visibilityValues).default("private"),
  metadata: metadataInputSchema,
  deviceInfo: z
    .object({
      browser: z.string().optional(),
      os: z.string().optional(),
      viewport: z.string().optional(),
    })
    .optional(),
  captureContentType: z.string().max(MAX_CONTENT_TYPE_LENGTH).optional(),
  hasDebuggerPayload: z.boolean().default(false),
  debuggerSummary: debuggerSummarySchema.optional(),
  extraAttachments: z
    .array(extraAttachmentInputSchema)
    .max(MAX_EXTRA_ATTACHMENTS_PER_REPORT)
    .optional(),
})

export const finalizeBugReportUploadInputSchema = z.object({
  id: z.string().min(1),
  captureContentType: z.string().max(MAX_CONTENT_TYPE_LENGTH).optional(),
  captureSizeBytes: z.number().int().nonnegative().optional(),
  debuggerSizeBytes: z.number().int().nonnegative().optional(),
  debuggerContentEncoding: z
    .string()
    .max(MAX_CONTENT_ENCODING_LENGTH)
    .optional(),
  extraAttachments: z
    .array(
      z.object({
        id: z.string().min(1),
        contentType: z.string().max(MAX_CONTENT_TYPE_LENGTH).optional(),
        sizeBytes: z
          .number()
          .int()
          .nonnegative()
          .max(MAX_EXTRA_ATTACHMENT_SIZE_BYTES)
          .optional(),
      })
    )
    .max(MAX_EXTRA_ATTACHMENTS_PER_REPORT)
    .optional(),
})

type CreateBugReportUploadSessionInput = z.infer<
  typeof createBugReportUploadSessionInputSchema
>
type FinalizeBugReportUploadInput = z.infer<
  typeof finalizeBugReportUploadInputSchema
>

type DirectUploadTarget = {
  headers: Record<string, string>
  key: string
  method: "PUT"
  url: string
}

function normalizeUploadMetadata(
  metadata: CreateBugReportUploadSessionInput["metadata"]
) {
  return {
    duration:
      metadata?.duration ??
      (typeof metadata?.durationMs === "number"
        ? formatDurationMs(metadata.durationMs)
        : undefined),
    durationMs: metadata?.durationMs,
    pageTitle: metadata?.pageTitle,
    sdkVersion: metadata?.sdkVersion,
    submittedVia: metadata?.submittedVia,
    thumbnailUrl: metadata?.thumbnailUrl,
  }
}

function buildEntitlementPayload(
  input: CreateBugReportUploadSessionInput
): CreateBugReportEntitlementInput {
  return {
    attachmentType: input.attachmentType,
    metadata: {
      durationMs: input.metadata?.durationMs,
    },
  }
}

function resolveCaptureContentType(input: {
  captureContentType?: string
  captureType: "video" | "screenshot"
}): string {
  if (input.captureContentType) {
    return input.captureContentType
  }

  return input.captureType === "video" ? "video/webm" : "image/png"
}

function resolveExtraAttachmentContentType(input: {
  contentType: string
  kind: ExtraAttachmentKind
}): string {
  if (input.kind === "screenshot") {
    return input.contentType.startsWith("image/")
      ? input.contentType
      : "image/png"
  }

  return input.contentType || "application/octet-stream"
}

function assertUniqueClientIds(
  attachments: CreateBugReportUploadSessionInput["extraAttachments"]
): void {
  if (!attachments || attachments.length === 0) {
    return
  }

  const clientIds = new Set<string>()
  for (const attachment of attachments) {
    if (clientIds.has(attachment.clientId)) {
      throw new ORPCError("BAD_REQUEST", {
        message: "extraAttachments clientId values must be unique.",
      })
    }
    clientIds.add(attachment.clientId)
  }
}

export async function createBugReportUploadSession(input: {
  input: CreateBugReportUploadSessionInput
  organizationId: string
  reporterId?: string | null
  tags?: string[] | undefined
}): Promise<{
  bugReportId: string
  captureUpload: DirectUploadTarget
  debuggerUpload?: DirectUploadTarget
  extraAttachmentUploads: Array<{
    clientId: string
    id: string
    kind: ExtraAttachmentKind
    upload: DirectUploadTarget
  }>
}> {
  await assertCreateBugReportEntitlements({
    organizationId: input.organizationId,
    payload: buildEntitlementPayload(input.input),
  })

  assertUniqueClientIds(input.input.extraAttachments)

  const storage = getStorageProvider()
  const normalizedMetadata = normalizeUploadMetadata(input.input.metadata)
  const inferredTitle =
    input.input.title ??
    input.input.metadata?.pageTitle?.trim() ??
    buildFallbackTitle(input.input.attachmentType)
  const extraAttachments = input.input.extraAttachments ?? []

  const result = await retryOnUniqueViolation(async () => {
    const bugReportId = nanoid(12)
    const captureKey = buildCaptureArtifactKey({
      organizationId: input.organizationId,
      bugReportId,
      captureType: input.input.attachmentType,
    })
    const debuggerKey = input.input.hasDebuggerPayload
      ? buildDebuggerArtifactKey({
          organizationId: input.organizationId,
          bugReportId,
        })
      : null

    const stagedExtraAttachments = extraAttachments.map((attachment, index) => {
      const attachmentId = nanoid(12)
      const contentType = resolveExtraAttachmentContentType({
        contentType: attachment.contentType,
        kind: attachment.kind,
      })
      const objectKey = buildExtraAttachmentArtifactKey({
        organizationId: input.organizationId,
        bugReportId,
        attachmentId,
        kind: attachment.kind,
        filename: attachment.filename,
      })

      return {
        id: attachmentId,
        clientId: attachment.clientId,
        kind: attachment.kind,
        sortOrder: attachment.sortOrder ?? index,
        filename: attachment.filename ?? null,
        objectKey,
        contentType,
      }
    })

    await db.insert(bugReportUploadSession).values({
      id: bugReportId,
      organizationId: input.organizationId,
      reporterId: input.reporterId ?? null,
      title: inferredTitle,
      description: input.input.description,
      priority: input.input.priority,
      reporterEmail: input.input.reporterEmail ?? null,
      tags: input.tags,
      url: input.input.url,
      attachmentType: input.input.attachmentType,
      captureKey,
      captureContentType: resolveCaptureContentType({
        captureContentType: input.input.captureContentType,
        captureType: input.input.attachmentType,
      }),
      debuggerKey,
      visibility: input.input.visibility,
      deviceInfo: input.input.deviceInfo,
      metadata: {
        ...normalizedMetadata,
        debuggerSummary: input.input.debuggerSummary,
      },
      expiresAt: new Date(Date.now() + BUG_REPORT_UPLOAD_SESSION_TTL_MS),
    })

    if (stagedExtraAttachments.length > 0) {
      await db.insert(bugReportUploadSessionAttachment).values(
        stagedExtraAttachments.map((attachment) => ({
          id: attachment.id,
          uploadSessionId: bugReportId,
          clientId: attachment.clientId,
          kind: attachment.kind,
          sortOrder: attachment.sortOrder,
          filename: attachment.filename,
          objectKey: attachment.objectKey,
          contentType: attachment.contentType,
        }))
      )
    }

    const captureUpload = await storage.createUploadUrl({
      filename: captureKey,
      contentType: resolveCaptureContentType({
        captureContentType: input.input.captureContentType,
        captureType: input.input.attachmentType,
      }),
    })

    const debuggerUpload = debuggerKey
      ? await storage.createUploadUrl({
          filename: debuggerKey,
          contentType: "application/json",
        })
      : null

    const extraAttachmentUploads = await Promise.all(
      stagedExtraAttachments.map(async (attachment) => {
        const upload = await storage.createUploadUrl({
          filename: attachment.objectKey,
          contentType: attachment.contentType,
        })

        return {
          clientId: attachment.clientId,
          id: attachment.id,
          kind: attachment.kind,
          upload: {
            ...upload,
            key: attachment.objectKey,
          },
        }
      })
    )

    return {
      bugReportId,
      captureKey,
      captureUpload,
      debuggerKey,
      debuggerUpload,
      extraAttachmentUploads,
    }
  })

  return {
    bugReportId: result.bugReportId,
    captureUpload: {
      ...result.captureUpload,
      key: result.captureKey,
    },
    debuggerUpload:
      result.debuggerKey && result.debuggerUpload
        ? {
            ...result.debuggerUpload,
            key: result.debuggerKey,
          }
        : undefined,
    extraAttachmentUploads: result.extraAttachmentUploads,
  }
}

export async function finalizeBugReportUpload(input: {
  input: FinalizeBugReportUploadInput
  organizationId: string
}): Promise<{
  debugger: PersistBugReportDebuggerDataResult
  id: string
  shareUrl: string
  warnings: string[]
}> {
  const uploadSession = await loadUploadSessionForFinalize(input)
  if (!uploadSession) {
    return finalizeAlreadyCompletedUpload(input)
  }

  await assertUploadSessionArtifactsExist({
    finalizeInput: input.input,
    uploadSession,
  })

  const captureContentType =
    input.input.captureContentType ??
    uploadSession.captureContentType ??
    resolveCaptureContentType({
      captureType:
        uploadSession.attachmentType === "screenshot" ? "screenshot" : "video",
    })
  const captureUploadedAt = new Date()
  const finalizeAttachmentById = new Map(
    (input.input.extraAttachments ?? []).map((attachment) => [
      attachment.id,
      attachment,
    ])
  )

  await persistFinalizedBugReport({
    captureContentType,
    captureUploadedAt,
    finalizeAttachmentById,
    finalizeInput: input.input,
    uploadSession,
  })

  const debuggerPersistence = uploadSession.debuggerKey
    ? await finalizeBugReportDebuggerIngestion({
        bugReportId: uploadSession.id,
        organizationId: uploadSession.organizationId,
      })
    : createEmptyDebuggerPersistence()

  const warnings = [...debuggerPersistence.warnings]
  const submissionStatus = resolveSubmissionStatus({
    debuggerPersistence,
    hasDebuggerKey: Boolean(uploadSession.debuggerKey),
  })

  await db
    .update(bugReport)
    .set({
      submissionStatus,
      updatedAt: new Date(),
    })
    .where(eq(bugReport.id, uploadSession.id))

  if (submissionStatus !== BUG_REPORT_SUBMISSION_STATUS_OPTIONS.ready) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Failed to process debugger data for this report.",
    })
  }

  // Sync to the organization's Kan "Bugs" list (server-side; never blocks report creation).
  syncBugReportToKan({
    id: uploadSession.id,
    organizationId: uploadSession.organizationId,
    title: uploadSession.title,
    description: uploadSession.description,
    url: uploadSession.url,
    priority: uploadSession.priority,
    sharePath: `/s/${uploadSession.id}`,
  })

  // Notify org owners about the new report (excludes the logged-in submitter).
  notifyOwnersAboutNewSubmissionInBackground(
    {
      kind: "bug-report",
      organizationId: uploadSession.organizationId,
      title: uploadSession.title || `Crikket bug ${uploadSession.id}`,
      priority: uploadSession.priority,
      reporterEmail: uploadSession.reporterEmail,
      reportId: uploadSession.id,
      excludeUserId: uploadSession.reporterId,
    },
    `new bug-report ${uploadSession.id}`
  )

  return {
    id: uploadSession.id,
    shareUrl: `/s/${uploadSession.id}`,
    warnings,
    debugger: debuggerPersistence,
  }
}

type UploadSessionWithAttachments = NonNullable<
  Awaited<ReturnType<typeof loadUploadSessionForFinalize>>
>

function loadUploadSessionForFinalize(input: {
  input: FinalizeBugReportUploadInput
  organizationId: string
}) {
  return db.query.bugReportUploadSession.findFirst({
    where: and(
      eq(bugReportUploadSession.id, input.input.id),
      eq(bugReportUploadSession.organizationId, input.organizationId)
    ),
    with: {
      attachments: {
        orderBy: [asc(bugReportUploadSessionAttachment.sortOrder)],
      },
    },
  })
}

async function finalizeAlreadyCompletedUpload(input: {
  input: FinalizeBugReportUploadInput
  organizationId: string
}): Promise<{
  debugger: PersistBugReportDebuggerDataResult
  id: string
  shareUrl: string
  warnings: string[]
}> {
  const existingReport = await db.query.bugReport.findFirst({
    where: and(
      eq(bugReport.id, input.input.id),
      eq(bugReport.organizationId, input.organizationId)
    ),
    columns: {
      id: true,
      submissionStatus: true,
    },
  })

  if (!existingReport) {
    throw new ORPCError("NOT_FOUND", { message: "Bug report upload not found" })
  }

  if (
    existingReport.submissionStatus !==
    BUG_REPORT_SUBMISSION_STATUS_OPTIONS.ready
  ) {
    throw new ORPCError("CONFLICT", {
      message: "Bug report submission is still processing.",
    })
  }

  return {
    debugger: createEmptyDebuggerPersistence(),
    id: existingReport.id,
    shareUrl: `/s/${existingReport.id}`,
    warnings: [],
  }
}

async function assertUploadSessionArtifactsExist(input: {
  finalizeInput: FinalizeBugReportUploadInput
  uploadSession: UploadSessionWithAttachments
}): Promise<void> {
  const { finalizeInput, uploadSession } = input

  if (uploadSession.expiresAt.getTime() <= Date.now()) {
    await db
      .delete(bugReportUploadSession)
      .where(eq(bugReportUploadSession.id, uploadSession.id))

    throw new ORPCError("BAD_REQUEST", {
      message: "Bug report upload session expired. Start a new submission.",
    })
  }

  const storage = getStorageProvider()
  const hasCapture = await storage.exists(uploadSession.captureKey)
  if (!hasCapture) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Capture upload has not completed yet.",
    })
  }

  if (uploadSession.debuggerKey) {
    const hasDebugger = await storage.exists(uploadSession.debuggerKey)
    if (!hasDebugger) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Debugger upload has not completed yet.",
      })
    }
  }

  const stagedAttachments = uploadSession.attachments ?? []
  const finalizeAttachmentById = new Map(
    (finalizeInput.extraAttachments ?? []).map((attachment) => [
      attachment.id,
      attachment,
    ])
  )

  if (
    finalizeInput.extraAttachments &&
    finalizeInput.extraAttachments.length !== stagedAttachments.length
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "extraAttachments must match the upload session attachments.",
    })
  }

  for (const stagedAttachment of stagedAttachments) {
    if (
      finalizeInput.extraAttachments &&
      !finalizeAttachmentById.has(stagedAttachment.id)
    ) {
      throw new ORPCError("BAD_REQUEST", {
        message: `Missing finalize metadata for attachment ${stagedAttachment.id}.`,
      })
    }

    const hasAttachment = await storage.exists(stagedAttachment.objectKey)
    if (!hasAttachment) {
      throw new ORPCError("BAD_REQUEST", {
        message: "One or more extra attachments have not completed uploading.",
      })
    }
  }
}

async function persistFinalizedBugReport(input: {
  captureContentType: string
  captureUploadedAt: Date
  finalizeAttachmentById: Map<
    string,
    NonNullable<FinalizeBugReportUploadInput["extraAttachments"]>[number]
  >
  finalizeInput: FinalizeBugReportUploadInput
  uploadSession: UploadSessionWithAttachments
}): Promise<void> {
  const {
    captureContentType,
    captureUploadedAt,
    finalizeAttachmentById,
    finalizeInput,
    uploadSession,
  } = input
  const stagedAttachments = uploadSession.attachments ?? []
  const debuggerUploadedAt =
    uploadSession.debuggerKey && (finalizeInput.debuggerSizeBytes ?? 0) > 0
      ? new Date()
      : null

  await db.transaction(async (tx) => {
    await tx.insert(bugReport).values({
      id: uploadSession.id,
      organizationId: uploadSession.organizationId,
      reporterId: uploadSession.reporterId,
      title: uploadSession.title,
      description: uploadSession.description,
      priority: uploadSession.priority,
      reporterEmail: uploadSession.reporterEmail,
      tags: uploadSession.tags,
      url: uploadSession.url,
      attachmentType: uploadSession.attachmentType,
      captureKey: uploadSession.captureKey,
      captureContentType,
      captureSizeBytes: finalizeInput.captureSizeBytes ?? null,
      captureUploadedAt,
      debuggerKey: uploadSession.debuggerKey,
      debuggerContentEncoding: finalizeInput.debuggerContentEncoding ?? null,
      debuggerSizeBytes: finalizeInput.debuggerSizeBytes ?? null,
      debuggerUploadedAt,
      debuggerIngestionStatus: uploadSession.debuggerKey
        ? BUG_REPORT_DEBUGGER_INGESTION_STATUS_OPTIONS.pending
        : BUG_REPORT_DEBUGGER_INGESTION_STATUS_OPTIONS.notUploaded,
      submissionStatus: BUG_REPORT_SUBMISSION_STATUS_OPTIONS.processing,
      visibility: uploadSession.visibility,
      deviceInfo: uploadSession.deviceInfo,
      status: "open",
      metadata: uploadSession.metadata,
    })

    if (stagedAttachments.length > 0) {
      await tx.insert(bugReportAttachment).values(
        stagedAttachments.map((attachment) => {
          const finalizeMeta = finalizeAttachmentById.get(attachment.id)

          return {
            id: attachment.id,
            bugReportId: uploadSession.id,
            kind: attachment.kind,
            sortOrder: attachment.sortOrder,
            filename: attachment.filename,
            objectKey: attachment.objectKey,
            contentType: finalizeMeta?.contentType ?? attachment.contentType,
            sizeBytes: finalizeMeta?.sizeBytes ?? null,
            uploadedAt: captureUploadedAt,
          }
        })
      )
    }

    await tx
      .delete(bugReportUploadSession)
      .where(eq(bugReportUploadSession.id, uploadSession.id))
  })
}

function resolveSubmissionStatus(input: {
  debuggerPersistence: PersistBugReportDebuggerDataResult
  hasDebuggerKey: boolean
}) {
  const { debuggerPersistence, hasDebuggerKey } = input
  const failedDebuggerIngestion =
    debuggerPersistence.warnings.length > 0 &&
    debuggerPersistence.persisted.actions === 0 &&
    debuggerPersistence.persisted.logs === 0 &&
    debuggerPersistence.persisted.networkRequests === 0 &&
    hasDebuggerKey

  return failedDebuggerIngestion
    ? BUG_REPORT_SUBMISSION_STATUS_OPTIONS.failed
    : BUG_REPORT_SUBMISSION_STATUS_OPTIONS.ready
}

const TRAILING_SLASHES_REGEX = /\/+$/

/**
 * Absolute public origin of the web app, so Kan cards link straight to the
 * Crikket report. Mirrors the server's capture share-origin fallback chain.
 */
function getPublicShareOrigin(): string {
  return (
    env.PUBLIC_APP_URL ??
    env.CORS_ORIGINS[0] ??
    env.BETTER_AUTH_URL
  ).replace(TRAILING_SLASHES_REGEX, "")
}

async function syncBugReportToKan(input: {
  id: string
  organizationId: string
  title: string | null
  description: string | null
  url: string | null
  priority: string | null
  sharePath: string
}): Promise<void> {
  try {
    const { createKanCard, getKanListPublicIdForOrganization } = await import(
      "@crikket/kan/client"
    )
    const listPublicId = getKanListPublicIdForOrganization({
      kind: "bugs",
      organizationId: input.organizationId,
    })
    if (!listPublicId) {
      return
    }

    const details = [
      input.description?.trim() || "",
      input.url ? `Page: ${input.url}` : "",
      input.priority ? `Priority: ${input.priority}` : "",
      `Crikket report: ${getPublicShareOrigin()}${input.sharePath}`,
      `Report ID: ${input.id}`,
    ]
      .filter((line) => line.length > 0)
      .join("\n\n")

    const card = await createKanCard({
      title: input.title || `Crikket bug ${input.id}`,
      description: details,
      listPublicId,
    })

    if (card?.publicId) {
      await db
        .update(bugReport)
        .set({ kanCardPublicId: card.publicId })
        .where(eq(bugReport.id, input.id))
        .catch((error: unknown) => {
          console.error(
            `[kan] failed to persist card id for bug-report ${input.id}`,
            error
          )
        })
    }
  } catch (error) {
    console.error("[kan] failed to queue bug-report sync", error)
  }
}

async function finalizeBugReportDebuggerIngestion(input: {
  bugReportId: string
  organizationId: string
}): Promise<PersistBugReportDebuggerDataResult> {
  const { jobId } = await queueBugReportIngestionJob(input)
  const result = await processBugReportIngestionJob({ jobId })

  if (result.status === "completed") {
    return result.debugger
  }

  return createEmptyDebuggerPersistence([
    "Failed to process debugger data for this report.",
  ])
}

function createEmptyDebuggerPersistence(
  warnings: string[] = []
): PersistBugReportDebuggerDataResult {
  return {
    requested: {
      actions: 0,
      logs: 0,
      networkRequests: 0,
    },
    persisted: {
      actions: 0,
      logs: 0,
      networkRequests: 0,
    },
    dropped: {
      actions: 0,
      logs: 0,
      networkRequests: 0,
    },
    warnings,
  }
}
