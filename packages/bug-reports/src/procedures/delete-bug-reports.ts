import { db } from "@crikket/db"
import { bugReport } from "@crikket/db/schema/bug-report"
import { ORPCError } from "@orpc/server"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"

import {
  extractStorageKeyFromUrl,
  removeArtifactEventually,
  removeAttachmentEventually,
  runAttachmentCleanupPass,
} from "../lib/storage"
import { protectedProcedure } from "./context"
import { requireActiveOrgId } from "./helpers"

export const deleteBugReport = protectedProcedure
  .input(z.object({ id: z.string().min(1) }))
  .handler(async ({ context, input }) => {
    const activeOrgId = requireActiveOrgId(context.session)

    const report = await db.query.bugReport.findFirst({
      where: and(
        eq(bugReport.id, input.id),
        eq(bugReport.organizationId, activeOrgId)
      ),
    })

    if (!report) {
      throw new ORPCError("NOT_FOUND", { message: "Bug report not found" })
    }

    const attachmentKey =
      report.captureKey ??
      report.attachmentKey ??
      (report.attachmentUrl
        ? extractStorageKeyFromUrl(report.attachmentUrl)
        : null)

    await db
      .delete(bugReport)
      .where(
        and(
          eq(bugReport.id, input.id),
          eq(bugReport.organizationId, activeOrgId)
        )
      )

    // Treat the database as the source of truth. Storage cleanup is best effort.
    if (attachmentKey) {
      await removeAttachmentEventually(attachmentKey)
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

    await runAttachmentCleanupPass({ limit: 10 })

    return { id: input.id }
  })

export const deleteBugReportsBulk = protectedProcedure
  .input(
    z.object({
      ids: z.array(z.string().min(1)).min(1).max(200),
    })
  )
  .handler(async ({ context, input }) => {
    const activeOrgId = requireActiveOrgId(context.session)
    const uniqueIds = Array.from(new Set(input.ids))

    const reports = await db.query.bugReport.findMany({
      where: and(
        eq(bugReport.organizationId, activeOrgId),
        inArray(bugReport.id, uniqueIds)
      ),
      columns: {
        id: true,
        captureKey: true,
        attachmentKey: true,
        attachmentUrl: true,
        debuggerKey: true,
        thumbnailKey: true,
      },
    })

    if (reports.length === 0) {
      return { deletedCount: 0 }
    }

    const attachmentKeys = reports
      .map((report) => {
        return (
          report.captureKey ??
          report.attachmentKey ??
          (report.attachmentUrl
            ? extractStorageKeyFromUrl(report.attachmentUrl)
            : null)
        )
      })
      .filter((value): value is string => typeof value === "string")

    // Persist deletion first, then clean up objects in storage.
    await db.delete(bugReport).where(
      and(
        eq(bugReport.organizationId, activeOrgId),
        inArray(
          bugReport.id,
          reports.map((report) => report.id)
        )
      )
    )

    for (const objectKey of attachmentKeys) {
      await removeAttachmentEventually(objectKey)
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

    await runAttachmentCleanupPass({ limit: 20 })

    return { deletedCount: reports.length }
  })
