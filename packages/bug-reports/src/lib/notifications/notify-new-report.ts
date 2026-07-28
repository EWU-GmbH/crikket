import { db } from "@crikket/db"
import { member, user } from "@crikket/db/schema/auth"
import { env } from "@crikket/env/server"
import { and, eq } from "drizzle-orm"
import {
  type NewReportEmailKind,
  sendNewReportEmail,
} from "./send-new-report-email"

const TRAILING_SLASHES_REGEX = /\/+$/

function getPublicShareOrigin(): string | null {
  const origin = env.PUBLIC_APP_URL ?? env.CORS_ORIGINS[0] ?? env.BETTER_AUTH_URL
  return origin ? origin.replace(TRAILING_SLASHES_REGEX, "") : null
}

async function loadOwnerRecipients(input: {
  organizationId: string
  excludeUserId?: string | null
}): Promise<string[]> {
  const owners = await db
    .select({ email: user.email, userId: member.userId })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(
      and(
        eq(member.organizationId, input.organizationId),
        eq(member.role, "owner")
      )
    )

  const recipients = new Set<string>()
  for (const owner of owners) {
    if (input.excludeUserId && owner.userId === input.excludeUserId) {
      continue
    }
    const email = owner.email?.trim()
    if (email) {
      recipients.add(email)
    }
  }

  return [...recipients]
}

/**
 * Notifies the organization's owners about a newly submitted bug report or
 * feature request. The submitter (when logged in) is excluded.
 */
export async function notifyOwnersAboutNewSubmission(input: {
  kind: NewReportEmailKind
  organizationId: string
  title: string
  priority?: string | null
  reporterEmail?: string | null
  reportId?: string
  excludeUserId?: string | null
}): Promise<void> {
  const recipients = await loadOwnerRecipients(input)
  if (recipients.length === 0) {
    return
  }

  const shareOrigin = getPublicShareOrigin()
  const shareUrl =
    input.kind === "bug-report" && input.reportId && shareOrigin
      ? `${shareOrigin}/s/${input.reportId}`
      : undefined

  for (const to of recipients) {
    await sendNewReportEmail({
      to,
      kind: input.kind,
      title: input.title,
      priority: input.priority,
      reporterLabel: input.reporterEmail?.trim() || "anonym (Widget)",
      shareUrl,
    })
  }
}

/** Fire-and-forget wrapper so mail delivery never blocks request handlers. */
export function notifyOwnersAboutNewSubmissionInBackground(
  input: Parameters<typeof notifyOwnersAboutNewSubmission>[0],
  context: string
): void {
  notifyOwnersAboutNewSubmission(input).catch((error: unknown) => {
    console.error(`[notify] ${context} failed`, error)
  })
}
