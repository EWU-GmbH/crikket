export interface PendingBugReportUploadSessionCleanupRecord {
  captureKey: string
  debuggerKey: string | null
}

export function resolvePendingBugReportUploadSessionArtifactKeys(
  session: PendingBugReportUploadSessionCleanupRecord
): {
  captureObjectKey: string
  debuggerObjectKey: string | null
} {
  return {
    captureObjectKey: session.captureKey,
    debuggerObjectKey: session.debuggerKey,
  }
}
