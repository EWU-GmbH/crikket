import {
  notifyReporterAboutResolutionInBackground,
  resetResolutionNotification,
} from "@crikket/bug-reports/lib/notifications/notify-resolution"
import { isResolvedStatus } from "@crikket/bug-reports/lib/status-side-effects"
import { db } from "@crikket/db"
import { bugReport } from "@crikket/db/schema/bug-report"
import { featureRequest } from "@crikket/db/schema/feature-request"
import { env } from "@crikket/env/server"
import { getAllKanDoneListPublicIds } from "@crikket/kan/client"
import { createHmac, timingSafeEqual } from "node:crypto"
import { eq } from "drizzle-orm"

const REOPEN_STATUS = "open"

function verifySignature(input: {
  rawBody: string
  signature: string | null
  secret: string
}): boolean {
  if (!input.signature) {
    return false
  }

  const expected = createHmac("sha256", input.secret)
    .update(input.rawBody)
    .digest("hex")

  const receivedBuffer = Buffer.from(input.signature, "utf8")
  const expectedBuffer = Buffer.from(expected, "utf8")

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  )
}

type KanCardMovedPayload = {
  event?: string
  data?: {
    card?: {
      publicId?: string
      listId?: string
    }
    changes?: {
      listId?: {
        from?: unknown
        to?: unknown
      }
    }
  }
}

function buildJsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

async function findBugReportByCard(cardPublicId: string) {
  return db.query.bugReport.findFirst({
    where: eq(bugReport.kanCardPublicId, cardPublicId),
    columns: { id: true, status: true },
  })
}

async function findFeatureRequestByCard(cardPublicId: string) {
  return db.query.featureRequest.findFirst({
    where: eq(featureRequest.kanCardPublicId, cardPublicId),
    columns: { id: true, status: true },
  })
}

/**
 * Kan → Crikket resolution sync. kan fires `card.moved` (HMAC-SHA256 signed
 * with KAN_WEBHOOK_SECRET); moving a synced card into/out of a configured
 * "Done" list resolves/reopens the linked report and triggers the reporter
 * notification. Idempotent: loops from our own Crikket → Kan moves are no-ops.
 */
export async function handleKanWebhook(input: {
  request: Request
}): Promise<Response> {
  const secret = env.KAN_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return buildJsonResponse(
      { ok: false, message: "Kan webhook is not configured." },
      501
    )
  }

  const rawBody = await input.request.text()

  const signatureValid = verifySignature({
    rawBody,
    signature: input.request.headers.get("x-webhook-signature"),
    secret,
  })
  if (!signatureValid) {
    return buildJsonResponse(
      { ok: false, message: "Invalid webhook signature." },
      401
    )
  }

  let payload: KanCardMovedPayload
  try {
    payload = JSON.parse(rawBody) as KanCardMovedPayload
  } catch {
    return buildJsonResponse(
      { ok: false, message: "Invalid JSON payload." },
      400
    )
  }

  if (payload.event !== "card.moved") {
    return buildJsonResponse({ ok: true, ignored: true })
  }

  const cardPublicId = payload.data?.card?.publicId
  const toListPublicId =
    (typeof payload.data?.changes?.listId?.to === "string"
      ? payload.data.changes.listId.to
      : undefined) ?? payload.data?.card?.listId

  if (!(cardPublicId && toListPublicId)) {
    return buildJsonResponse({ ok: true, ignored: true })
  }

  const doneListPublicIds = new Set(getAllKanDoneListPublicIds())
  const movedToDone = doneListPublicIds.has(toListPublicId)

  const report = await findBugReportByCard(cardPublicId)
  const feature = report ? null : await findFeatureRequestByCard(cardPublicId)

  if (!(report || feature)) {
    return buildJsonResponse({ ok: true, ignored: true })
  }

  const kind = report ? "bug-report" : "feature-request"
  const record = report ?? feature
  if (!record) {
    return buildJsonResponse({ ok: true, ignored: true })
  }
  const recordId = record.id
  const wasResolved = isResolvedStatus(record.status)

  if (movedToDone && !wasResolved) {
    if (report) {
      await db
        .update(bugReport)
        .set({ status: "resolved" })
        .where(eq(bugReport.id, recordId))
    } else {
      await db
        .update(featureRequest)
        .set({ status: "resolved" })
        .where(eq(featureRequest.id, recordId))
    }

    notifyReporterAboutResolutionInBackground(
      { kind, id: recordId },
      `kan webhook resolution for ${kind} ${recordId}`
    )

    return buildJsonResponse({ ok: true, resolved: true })
  }

  if (!movedToDone && wasResolved) {
    if (report) {
      await db
        .update(bugReport)
        .set({ status: REOPEN_STATUS })
        .where(eq(bugReport.id, recordId))
    } else {
      await db
        .update(featureRequest)
        .set({ status: REOPEN_STATUS })
        .where(eq(featureRequest.id, recordId))
    }

    await resetResolutionNotification({ kind, id: recordId })

    return buildJsonResponse({ ok: true, reopened: true })
  }

  return buildJsonResponse({ ok: true, noop: true })
}
