import { db } from "@crikket/db"
import { bugReport } from "@crikket/db/schema/bug-report"
import { BUG_REPORT_STATUS_OPTIONS } from "@crikket/shared/constants/bug-report"
import { eq } from "drizzle-orm"
import {
  notifyReporterAboutResolutionInBackground,
  resetResolutionNotification,
} from "./notifications/notify-resolution"

const RESOLVED_STATUSES: ReadonlySet<string> = new Set([
  BUG_REPORT_STATUS_OPTIONS.resolved,
  BUG_REPORT_STATUS_OPTIONS.closed,
])

export function isResolvedStatus(status: string): boolean {
  return RESOLVED_STATUSES.has(status)
}

/**
 * Fire-and-forget side effects for a bug report status transition:
 * resolved/closed → notify reporter + move the Kan card to "Done";
 * reopen → re-arm the notification so a later resolution notifies again.
 */
export function handleBugReportStatusTransition(input: {
  id: string
  organizationId: string
  previousStatus: string
  newStatus: string
}): void {
  const wasResolved = isResolvedStatus(input.previousStatus)
  const isResolved = isResolvedStatus(input.newStatus)

  if (!wasResolved && isResolved) {
    notifyReporterAboutResolutionInBackground(
      { kind: "bug-report", id: input.id },
      `bug-report ${input.id} resolution`
    )
    moveKanCardToDoneInBackground(input)
    return
  }

  if (wasResolved && !isResolved) {
    resetResolutionNotification({ kind: "bug-report", id: input.id }).catch(
      (error: unknown) => {
        console.error(
          `[notify] failed to re-arm notification for bug-report ${input.id}`,
          error
        )
      }
    )
  }
}

function moveKanCardToDoneInBackground(input: {
  id: string
  organizationId: string
}): void {
  void (async () => {
    const { getKanDoneListPublicIdForOrganization, moveKanCardToList } =
      await import("@crikket/kan/client")
    const doneListPublicId = getKanDoneListPublicIdForOrganization({
      kind: "bugs",
      organizationId: input.organizationId,
    })
    if (!doneListPublicId) {
      return
    }

    const report = await db.query.bugReport.findFirst({
      where: eq(bugReport.id, input.id),
      columns: { kanCardPublicId: true },
    })
    if (!report?.kanCardPublicId) {
      return
    }

    await moveKanCardToList({
      cardPublicId: report.kanCardPublicId,
      listPublicId: doneListPublicId,
    })
  })().catch((error: unknown) => {
    console.error(`[kan] move bug-report ${input.id} to Done failed`, error)
  })
}
