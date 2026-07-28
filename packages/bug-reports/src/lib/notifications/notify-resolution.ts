import { db } from "@crikket/db"
import { user } from "@crikket/db/schema/auth"
import { bugReport } from "@crikket/db/schema/bug-report"
import { featureRequest } from "@crikket/db/schema/feature-request"
import { env } from "@crikket/env/server"
import { and, eq, isNull } from "drizzle-orm"
import {
  type ResolutionEmailKind,
  sendResolutionEmail,
} from "./send-resolution-email"

export type ResolvableKind = ResolutionEmailKind

type ResolvableRecord = {
  id: string
  title: string | null
  reporterEmail: string | null
  reporterId: string | null
  visibility: string | null
}

const FALLBACK_TITLES: Record<ResolvableKind, string> = {
  "bug-report": "Ihr Bug Report",
  "feature-request": "Ihr Feature Request",
}

async function loadResolvableRecord(input: {
  kind: ResolvableKind
  id: string
}): Promise<ResolvableRecord | null> {
  if (input.kind === "bug-report") {
    const record = await db.query.bugReport.findFirst({
      where: eq(bugReport.id, input.id),
      columns: {
        id: true,
        title: true,
        reporterEmail: true,
        reporterId: true,
        visibility: true,
      },
    })
    return record ?? null
  }

  const record = await db.query.featureRequest.findFirst({
    where: eq(featureRequest.id, input.id),
    columns: {
      id: true,
      title: true,
      reporterEmail: true,
    },
  })
  return record
    ? { ...record, reporterId: null, visibility: null }
    : null
}

/** Atomically claim the notification slot; false when already notified. */
async function tryClaimNotification(input: {
  kind: ResolvableKind
  id: string
}): Promise<boolean> {
  const claimedAt = new Date()

  if (input.kind === "bug-report") {
    const claimed = await db
      .update(bugReport)
      .set({ resolutionNotifiedAt: claimedAt })
      .where(
        and(eq(bugReport.id, input.id), isNull(bugReport.resolutionNotifiedAt))
      )
      .returning({ id: bugReport.id })
    return claimed.length > 0
  }

  const claimed = await db
    .update(featureRequest)
    .set({ resolutionNotifiedAt: claimedAt })
    .where(
      and(
        eq(featureRequest.id, input.id),
        isNull(featureRequest.resolutionNotifiedAt)
      )
    )
    .returning({ id: featureRequest.id })
  return claimed.length > 0
}

/** Allow a fresh notification when a resolved report is reopened. */
export async function resetResolutionNotification(input: {
  kind: ResolvableKind
  id: string
}): Promise<void> {
  if (input.kind === "bug-report") {
    await db
      .update(bugReport)
      .set({ resolutionNotifiedAt: null })
      .where(eq(bugReport.id, input.id))
    return
  }

  await db
    .update(featureRequest)
    .set({ resolutionNotifiedAt: null })
    .where(eq(featureRequest.id, input.id))
}

async function resolveRecipientEmail(
  record: ResolvableRecord
): Promise<string | null> {
  if (record.reporterEmail) {
    return record.reporterEmail
  }

  if (!record.reporterId) {
    return null
  }

  const reporter = await db.query.user.findFirst({
    where: eq(user.id, record.reporterId),
    columns: { email: true },
  })
  return reporter?.email ?? null
}

function resolveShareUrl(record: ResolvableRecord): string | undefined {
  const appUrl = env.CORS_ORIGINS[0]
  if (!appUrl || record.visibility !== "public") {
    return undefined
  }

  return new URL(`/s/${record.id}`, appUrl).toString()
}

/**
 * Sends the "resolved" email to the reporter exactly once per resolution.
 * Caller must ensure the record actually transitioned to a resolved status.
 */
export async function notifyReporterAboutResolution(input: {
  kind: ResolvableKind
  id: string
}): Promise<void> {
  const record = await loadResolvableRecord(input)
  if (!record) {
    return
  }

  const claimed = await tryClaimNotification(input)
  if (!claimed) {
    return
  }

  const recipient = await resolveRecipientEmail(record)
  if (!recipient) {
    return
  }

  await sendResolutionEmail({
    to: recipient,
    kind: input.kind,
    title: record.title || FALLBACK_TITLES[input.kind],
    shareUrl: resolveShareUrl(record),
  })
}

/** Fire-and-forget wrapper so mail delivery never blocks request handlers. */
export function notifyReporterAboutResolutionInBackground(
  input: {
    kind: ResolvableKind
    id: string
  },
  context: string
): void {
  notifyReporterAboutResolution(input).catch((error: unknown) => {
    console.error(`[notify] ${context} failed`, error)
  })
}
