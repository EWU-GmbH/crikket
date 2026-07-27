import { db } from "@crikket/db"
import { bugReport, bugReportAttachment } from "@crikket/db/schema/bug-report"
import { ORPCError } from "@orpc/server"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"

import {
  removeArtifactEventually,
  removeCaptureArtifactEventually,
  runArtifactCleanupPass,
} from "../lib/storage"
import { protectedProcedure } from "./context"
import { requireBugReportsWriteAccess } from "./helpers"

async function collectAttachmentObjectKeys(
  bugReportIds: string[]
): Promise<string[]> {
  if (bugReportIds.length === 0) {
    return []
  }

  const attachments = await db.query.bugReportAttachment.findMany({
    where: inArray(bugReportAttachment.bugReportId, bugReportIds),
    columns: {
      objectKey: true,
    },
  })

  return attachments.map((attachment) => attachment.objectKey)
}

export const deleteBugReport = protectedProcedure
  .input(z.object({ id: z.string().min(1) }))
  .handler(async ({ context, input }) => {
    const activeOrgId = requireBugReportsWriteAccess(context)

    const report = await db.query.bugReport.findFirst({
      where: and(
        eq(bugReport.id, input.id),
        eq(bugReport.organizationId, activeOrgId)
      ),
    })

    if (!report) {
      throw new ORPCError("NOT_FOUND", { message: "Bug report not found" })
    }

    const attachmentObjectKeys = await collectAttachmentObjectKeys([input.id])

    await db
      .delete(bugReport)
      .where(
        and(
          eq(bugReport.id, input.id),
          eq(bugReport.organizationId, activeOrgId)
        )
      )

    if (report.captureKey) {
      await removeCaptureArtifactEventually(report.captureKey)
    }
    if (report.debuggerKey) {
      await removeArtifactEventually({
        artifactKind: "debugger",
        objectKey: report.debuggerKey,
      })
    }
    if (report.thumbnailKey) {
      await removeArtifactEventually({
        artifactKind: "thumbnail",
        objectKey: report.thumbnailKey,
      })
    }

    for (const objectKey of attachmentObjectKeys) {
      await removeArtifactEventually({
        artifactKind: "attachment",
        objectKey,
      })
    }

    await runArtifactCleanupPass({ limit: 10 })

    return { id: input.id }
  })

export const deleteBugReportsBulk = protectedProcedure
  .input(
    z.object({
      ids: z.array(z.string().min(1)).min(1).max(200),
    })
  )
  .handler(async ({ context, input }) => {
    const activeOrgId = requireBugReportsWriteAccess(context)
    const uniqueIds = Array.from(new Set(input.ids))

    const reports = await db.query.bugReport.findMany({
      where: and(
        eq(bugReport.organizationId, activeOrgId),
        inArray(bugReport.id, uniqueIds)
      ),
      columns: {
        id: true,
        captureKey: true,
        debuggerKey: true,
        thumbnailKey: true,
      },
    })

    if (reports.length === 0) {
      return { deletedCount: 0 }
    }

    const reportIds = reports.map((report) => report.id)
    const captureKeys = reports
      .map((report) => report.captureKey)
      .filter((value): value is string => typeof value === "string")
    const attachmentObjectKeys = await collectAttachmentObjectKeys(reportIds)

    await db
      .delete(bugReport)
      .where(
        and(
          eq(bugReport.organizationId, activeOrgId),
          inArray(bugReport.id, reportIds)
        )
      )

    for (const objectKey of captureKeys) {
      await removeCaptureArtifactEventually(objectKey)
    }

    for (const report of reports) {
      if (report.debuggerKey) {
        await removeArtifactEventually({
          artifactKind: "debugger",
          objectKey: report.debuggerKey,
        })
      }

      if (report.thumbnailKey) {
        await removeArtifactEventually({
          artifactKind: "thumbnail",
          objectKey: report.thumbnailKey,
        })
      }
    }

    for (const objectKey of attachmentObjectKeys) {
      await removeArtifactEventually({
        artifactKind: "attachment",
        objectKey,
      })
    }

    await runArtifactCleanupPass({ limit: 20 })

    return { deletedCount: reports.length }
  })
