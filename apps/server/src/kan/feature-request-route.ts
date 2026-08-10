import { sendReporterFollowUpEmail } from "@crikket/bug-reports/lib/notifications/send-reporter-follow-up-email"
import { commentBodySchema } from "@crikket/bug-reports/procedures/bug-report-comments"
import { db } from "@crikket/db"
import {
  featureRequest,
  featureRequestComment,
} from "@crikket/db/schema/feature-request"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { z } from "zod"
import { isKanToCrikketAuthorized } from "./auth"

const kanCardPublicIdSchema = z.string().trim().min(12).max(12)

const followUpBodySchema = z.object({
  message: commentBodySchema,
})

function buildJsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function unauthorizedResponse() {
  return buildJsonResponse(
    { ok: false, message: "Unauthorized." },
    401
  )
}

function notConfiguredResponse() {
  return buildJsonResponse(
    { ok: false, message: "Kan integration is not configured." },
    501
  )
}

async function findFeatureRequestByKanCard(kanCardPublicId: string) {
  return db.query.featureRequest.findFirst({
    where: eq(featureRequest.kanCardPublicId, kanCardPublicId),
    columns: {
      id: true,
      title: true,
      reporterEmail: true,
      status: true,
    },
  })
}

export async function handleKanFeatureRequestLookup(input: {
  request: Request
  kanCardPublicId: string
}): Promise<Response> {
  if (!isKanToCrikketAuthorized(input.request)) {
    return unauthorizedResponse()
  }

  const kanCardPublicId = kanCardPublicIdSchema.safeParse(
    input.kanCardPublicId
  )
  if (!kanCardPublicId.success) {
    return buildJsonResponse(
      { ok: false, message: "Invalid Kan card public ID." },
      400
    )
  }

  const record = await findFeatureRequestByKanCard(kanCardPublicId.data)
  if (!record) {
    return buildJsonResponse({ ok: false, message: "Not found." }, 404)
  }

  const reporterEmail = record.reporterEmail?.trim() ?? ""

  return buildJsonResponse({
    ok: true,
    featureRequestId: record.id,
    title: record.title,
    hasReporterEmail: reporterEmail.length > 0,
    reporterEmail: reporterEmail.length > 0 ? reporterEmail : null,
    status: record.status,
  })
}

export async function handleKanFeatureRequestReporterFollowUp(input: {
  request: Request
  kanCardPublicId: string
}): Promise<Response> {
  if (!isKanToCrikketAuthorized(input.request)) {
    return unauthorizedResponse()
  }

  const secretConfigured = Boolean(process.env.KAN_WEBHOOK_SECRET?.trim())
  if (!secretConfigured) {
    return notConfiguredResponse()
  }

  const kanCardPublicId = kanCardPublicIdSchema.safeParse(
    input.kanCardPublicId
  )
  if (!kanCardPublicId.success) {
    return buildJsonResponse(
      { ok: false, message: "Invalid Kan card public ID." },
      400
    )
  }

  let body: z.infer<typeof followUpBodySchema>
  try {
    body = followUpBodySchema.parse(await input.request.json())
  } catch {
    return buildJsonResponse(
      { ok: false, message: "Invalid JSON payload." },
      400
    )
  }

  const record = await findFeatureRequestByKanCard(kanCardPublicId.data)
  if (!record) {
    return buildJsonResponse(
      { ok: false, message: "Feature request not found for this card." },
      404
    )
  }

  const recipient = record.reporterEmail?.trim()
  if (!recipient) {
    return buildJsonResponse(
      {
        ok: false,
        message:
          "Keine E-Mail-Adresse des Melders hinterlegt — Rückfrage kann nicht gesendet werden.",
      },
      400
    )
  }

  await sendReporterFollowUpEmail({
    to: recipient,
    title: record.title.trim() || "Ihr Feature Request",
    message: body.message,
  })

  const [inserted] = await db
    .insert(featureRequestComment)
    .values({
      id: nanoid(16),
      featureRequestId: record.id,
      authorUserId: null,
      body: body.message,
      kind: "to_reporter",
    })
    .returning({ id: featureRequestComment.id })

  if (!inserted) {
    return buildJsonResponse(
      { ok: false, message: "Failed to save follow-up comment." },
      500
    )
  }

  return buildJsonResponse({
    ok: true,
    commentId: inserted.id,
  })
}
