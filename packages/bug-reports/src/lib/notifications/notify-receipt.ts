import { db } from "@crikket/db"
import { organization } from "@crikket/db/schema/auth"
import { bugReport } from "@crikket/db/schema/bug-report"
import { and, eq, isNull } from "drizzle-orm"
import {
  decideReceiptEmail,
  isReporterReceiptEmailEnabled,
} from "./receipt-policy"
import { sendReceiptEmail } from "./send-receipt-email"
import { getBugReportShareUrl, getReporterAccountUrls } from "./share-url"

async function tryClaimReceiptNotification(id: string): Promise<boolean> {
  const claimed = await db
    .update(bugReport)
    .set({ receiptNotifiedAt: new Date() })
    .where(and(eq(bugReport.id, id), isNull(bugReport.receiptNotifiedAt)))
    .returning({ id: bugReport.id })

  return claimed.length > 0
}

/**
 * Sends the receipt mail at most once. The marker is claimed before delivery
 * so a retry of the same submission cannot send a second mail. Failures are
 * thrown for the background wrapper to log; the marker stays set.
 */
export async function notifyReporterAboutReceipt(input: {
  id: string
}): Promise<void> {
  const record = await db.query.bugReport.findFirst({
    where: eq(bugReport.id, input.id),
    columns: {
      id: true,
      title: true,
      reporterEmail: true,
      organizationId: true,
      receiptNotifiedAt: true,
    },
  })

  if (!record?.reporterEmail?.trim() || record.receiptNotifiedAt) {
    return
  }

  const organizationRecord = await db.query.organization.findFirst({
    where: eq(organization.id, record.organizationId),
    columns: { reporterReceiptEmailEnabled: true },
  })
  const decision = decideReceiptEmail({
    alreadyNotified: record.receiptNotifiedAt !== null,
    organizationEnabled: isReporterReceiptEmailEnabled(
      organizationRecord?.reporterReceiptEmailEnabled
    ),
    reporterEmail: record.reporterEmail,
  })

  if (decision === "skip") {
    return
  }

  const claimed = await tryClaimReceiptNotification(record.id)
  if (!claimed || decision === "claim-without-send") {
    return
  }

  const accountUrls = getReporterAccountUrls()
  await sendReceiptEmail({
    to: record.reporterEmail?.trim() ?? "",
    title: record.title?.trim() || "Ihre Meldung",
    shareUrl: getBugReportShareUrl(record.id),
    registerUrl: accountUrls.registerUrl,
    loginUrl: accountUrls.loginUrl,
  })
}

/** Fire-and-forget wrapper so mail delivery never blocks request handlers. */
export function notifyReporterAboutReceiptInBackground(
  input: { id: string },
  context: string
): void {
  notifyReporterAboutReceipt(input).catch((error: unknown) => {
    console.error(`[notify] ${context} failed`, error)
  })
}
