import { db } from "@crikket/db"
import { bugReportUploadSession } from "@crikket/db/schema/bug-report"
import { and, eq, lte } from "drizzle-orm"
import { resolvePendingBugReportUploadSessionArtifactKeys } from "./orphan-cleanup-utils"
import { removeArtifactEventually } from "./storage"

const STALE_PENDING_UPLOAD_DEFAULT_BATCH = 25

export async function runStalePendingBugReportCleanupPass(options?: {
  limit?: number
}): Promise<{ deleted: number; processed: number }> {
  const staleSessions = await db.query.bugReportUploadSession.findMany({
    where: lte(bugReportUploadSession.expiresAt, new Date()),
    columns: {
      captureKey: true,
      debuggerKey: true,
      id: true,
      organizationId: true,
    },
    limit: options?.limit ?? STALE_PENDING_UPLOAD_DEFAULT_BATCH,
  })

  let deleted = 0

  for (const session of staleSessions) {
    await db
      .delete(bugReportUploadSession)
      .where(
        and(
          eq(bugReportUploadSession.id, session.id),
          eq(bugReportUploadSession.organizationId, session.organizationId)
        )
      )

    const { captureObjectKey, debuggerObjectKey } =
      resolvePendingBugReportUploadSessionArtifactKeys(session)

    await removeArtifactEventually({
      artifactKind: "capture",
      objectKey: captureObjectKey,
    })

    if (debuggerObjectKey) {
      await removeArtifactEventually({
        artifactKind: "debugger",
        objectKey: debuggerObjectKey,
      })
    }

    deleted += 1
  }

  return {
    deleted,
    processed: staleSessions.length,
  }
}
