const BUG_REPORT_INGESTION_BASE_DELAY_MS = 60_000
const BUG_REPORT_INGESTION_MAX_DELAY_MS = 24 * 60 * 60 * 1000
const BUG_REPORT_INGESTION_MAX_ATTEMPTS = 5

export function calculateBugReportIngestionRetryDelayMs(
  attempts: number
): number {
  const exponent = Math.max(0, attempts - 1)
  const delay = BUG_REPORT_INGESTION_BASE_DELAY_MS * 2 ** exponent
  return Math.min(delay, BUG_REPORT_INGESTION_MAX_DELAY_MS)
}

export function resolveBugReportIngestionFailureStatus(
  attempts: number
): "dead_letter" | "failed" {
  return attempts >= BUG_REPORT_INGESTION_MAX_ATTEMPTS
    ? "dead_letter"
    : "failed"
}
