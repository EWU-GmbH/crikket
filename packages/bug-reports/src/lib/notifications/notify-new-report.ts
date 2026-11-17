import { db } from "@crikket/db"
import { member, user } from "@crikket/db/schema/auth"
import { and, eq } from "drizzle-orm"
import type {
  NewReportEmailAttachments,
  NewReportEmailDeviceInfo,
} from "./new-report-email-content"
import {
  type NewReportEmailKind,
  sendNewReportEmail,
} from "./send-new-report-email"
import { getBugReportShareUrl } from "./share-url"

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
  description?: string | null
  priority?: string | null
  reporterEmail?: string | null
  reportId?: string
  pageUrl?: string | null
  pageTitle?: string | null
  deviceInfo?: NewReportEmailDeviceInfo
  attachments?: NewReportEmailAttachments | null
  submittedAt?: Date
  /** Explicit ticket link (feature requests live in Kan, not in the dashboard). */
  ticketUrl?: string | null
  excludeUserId?: string | null
}): Promise<void> {
  const recipients = await loadOwnerRecipients(input)
  if (recipients.length === 0) {
    return
  }

  const ticketUrl =
    input.ticketUrl ??
    (input.kind === "bug-report" && input.reportId
      ? getBugReportShareUrl(input.reportId)
      : undefined)

  for (const [index, to] of recipients.entries()) {
    try {
      await sendNewReportEmail({
        to,
        kind: input.kind,
        title: input.title,
        description: input.description,
        priority: input.priority,
        reporterLabel: input.reporterEmail?.trim() || "anonym (Widget)",
        pageUrl: input.pageUrl,
        pageTitle: input.pageTitle,
        deviceInfo: input.deviceInfo,
        attachments: input.attachments,
        submittedAt: input.submittedAt,
        ticketUrl,
      })
    } catch (error) {
      console.error(
        `[notify] new ${input.kind} mail failed for owner ${index + 1}/${recipients.length} (organization ${input.organizationId})`,
        error
      )
    }
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
