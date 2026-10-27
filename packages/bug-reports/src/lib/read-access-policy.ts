import { BUG_REPORT_SUBMISSION_STATUS_OPTIONS } from "@crikket/shared/constants/bug-report"

export function shouldExposeBugReportToViewer(input: {
  canAccessUnready: boolean
  submissionStatus: string
}): boolean {
  return (
    input.canAccessUnready ||
    input.submissionStatus === BUG_REPORT_SUBMISSION_STATUS_OPTIONS.ready
  )
}

export interface ReporterViewer {
  id: string
  email: string
  emailVerified: boolean
}

function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ""
}

/**
 * Widget submissions only carry a reporter email (no user id), so the
 * reporter is matched by email — but only against a verified account email,
 * otherwise anyone could register with a foreign address and read the report.
 */
export function isBugReportReporter(input: {
  viewer: ReporterViewer | null | undefined
  reporterId: string | null
  reporterEmail: string | null
}): boolean {
  const viewer = input.viewer
  if (!viewer) {
    return false
  }

  if (input.reporterId && input.reporterId === viewer.id) {
    return true
  }

  const reporterEmail = normalizeEmail(input.reporterEmail)
  return (
    viewer.emailVerified &&
    reporterEmail.length > 0 &&
    reporterEmail === normalizeEmail(viewer.email)
  )
}
