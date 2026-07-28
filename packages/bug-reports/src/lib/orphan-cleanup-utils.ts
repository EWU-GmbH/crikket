export interface PendingBugReportUploadSessionCleanupRecord {
  captureKey: string
  debuggerKey: string | null
  attachmentObjectKeys?: string[]
}

export function resolvePendingBugReportUploadSessionArtifactKeys(
  session: PendingBugReportUploadSessionCleanupRecord
): {
  captureObjectKey: string
  debuggerObjectKey: string | null
  attachmentObjectKeys: string[]
} {
  return {
    captureObjectKey: session.captureKey,
    debuggerObjectKey: session.debuggerKey,
    attachmentObjectKeys: session.attachmentObjectKeys ?? [],
  }
}
