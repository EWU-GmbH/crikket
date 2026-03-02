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
