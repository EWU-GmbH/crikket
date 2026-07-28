import {
  BUG_REPORT_VISIBILITY_OPTIONS,
  type BugReportVisibility,
} from "@crikket/shared/constants/bug-report"
import {
  PRIORITY_OPTIONS,
  type Priority,
} from "@crikket/shared/constants/priorities"
import type { CaptureSubmissionDraft } from "../../../types"

const priorityValues = new Set<string>(Object.values(PRIORITY_OPTIONS))
const visibilityValues = new Set<string>(
  Object.values(BUG_REPORT_VISIBILITY_OPTIONS)
)
export type ReviewDraftErrors = Partial<
  Record<keyof CaptureSubmissionDraft, string>
>

export const capturePriorityOptions = [
  { label: "Kritisch", value: PRIORITY_OPTIONS.critical },
  { label: "Hoch", value: PRIORITY_OPTIONS.high },
  { label: "Mittel", value: PRIORITY_OPTIONS.medium },
  { label: "Niedrig", value: PRIORITY_OPTIONS.low },
  { label: "Keine", value: PRIORITY_OPTIONS.none },
] as const

export function validateReviewDraft(
  value: CaptureSubmissionDraft
): ReviewDraftErrors | undefined {
  const errors: ReviewDraftErrors = {}

  if (value.title.length > 200) {
    errors.title = "Der Titel darf höchstens 200 Zeichen lang sein."
  }

  if (value.description.length > 3000) {
    errors.description =
      "Die Beschreibung darf höchstens 3000 Zeichen lang sein."
  }

  if (!priorityValues.has(value.priority)) {
    errors.priority = "Wählen Sie eine gültige Priorität."
  }

  if (
    value.visibility !== undefined &&
    !visibilityValues.has(value.visibility)
  ) {
    errors.visibility = "Wählen Sie eine gültige Sichtbarkeit."
  }

  return Object.keys(errors).length > 0 ? errors : undefined
}

export function trimReviewDraftForSubmission(
  draft: CaptureSubmissionDraft
): CaptureSubmissionDraft {
  return {
    description: draft.description.trim(),
    priority: draft.priority,
    title: draft.title.trim(),
    visibility: visibilityValues.has(draft.visibility ?? "")
      ? (draft.visibility as BugReportVisibility)
      : BUG_REPORT_VISIBILITY_OPTIONS.private,
  }
}

export type CapturePriority = Priority
