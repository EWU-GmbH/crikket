import {
  BUG_REPORT_COMMENT_KIND_OPTIONS,
  BUG_REPORT_SUBMISSION_STATUS_OPTIONS,
} from "@crikket/shared/constants/bug-report"

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

/**
 * Share-page audience for to_reporter comments.
 * Organization viewers are members of the report's organization (or an API
 * token of that organization). Anonymous visitors are never included.
 */
export function canViewReporterFacingComments(input: {
  isOrganizationViewer: boolean
  reporterEmail: string | null
  reporterId: string | null
  viewer: ReporterViewer | null | undefined
}): boolean {
  if (input.isOrganizationViewer) {
    return true
  }

  return isBugReportReporter(input)
}

export function projectReporterFacingComments<
  T extends {
    id: string
    body: string
    createdAt: string
    kind: string
  },
>(input: {
  allowed: boolean
  comments: readonly T[]
}): Array<{
  id: string
  body: string
  createdAt: string
}> {
  if (!input.allowed) {
    return []
  }

  return input.comments
    .filter(
      (comment) => comment.kind === BUG_REPORT_COMMENT_KIND_OPTIONS.toReporter
    )
    .map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
    }))
}
