import { BUG_REPORT_VISIBILITY_OPTIONS } from "@crikket/shared/constants/bug-report"
import { defaultSubmitTransport } from "../transport/default-submit-transport"
import type {
  CapturedMedia,
  CaptureRuntimeConfig,
  CaptureSubmissionDraft,
  CaptureSubmitResult,
  CaptureSubmitTransport,
  ReviewSnapshot,
} from "../types"
import type { CaptureReviewSubmitOptions } from "../ui/types"
import { getDeviceInfo, getPageTitle, getPageUrl } from "../utils"

export function submitCapturedReport(input: {
  config: CaptureRuntimeConfig
  draft: CaptureSubmissionDraft
  media: CapturedMedia
  review: ReviewSnapshot
  submitOptions?: CaptureReviewSubmitOptions
  submitTransport?: CaptureSubmitTransport
}): Promise<CaptureSubmitResult> {
  const submitTransport = input.submitTransport ?? defaultSubmitTransport

  const reporterEmail = input.draft.reporterEmail?.trim() ?? ""

  return submitTransport({
    config: input.config,
    report: {
      captureType: input.media.captureType,
      title: input.draft.title.trim(),
      description: input.draft.description.trim(),
      priority: input.draft.priority,
      visibility: BUG_REPORT_VISIBILITY_OPTIONS.private,
      reporterEmail: reporterEmail.length > 0 ? reporterEmail : undefined,
      pageUrl: getPageUrl(),
      pageTitle: getPageTitle(),
      durationMs: input.media.durationMs,
      deviceInfo: getDeviceInfo(),
      debuggerPayload: input.review.debuggerPayload,
      debuggerSummary: input.review.debuggerSummary,
      media: input.media.blob,
      extraAttachments: input.submitOptions?.extraAttachments,
    },
  })
}
