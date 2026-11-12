import {
  BUG_REPORT_COMMENT_KIND_OPTIONS,
  BUG_REPORT_COMMENT_KIND_VALUES,
  BUG_REPORT_COMMENT_PURPOSE_OPTIONS,
  BUG_REPORT_COMMENT_PURPOSE_VALUES,
  BUG_REPORT_STATUS_OPTIONS,
  type BugReportCommentPurpose,
} from "@crikket/shared/constants/bug-report"
import { z } from "zod"

export const MAX_COMMENT_BODY_LENGTH = 4000

export const MISSING_REPORTER_EMAIL_QUESTION_MESSAGE =
  "Keine E-Mail-Adresse des Erstellers hinterlegt — Rückfrage kann nicht gesendet werden"

export const MISSING_REPORTER_EMAIL_INFO_MESSAGE =
  "Keine E-Mail-Adresse des Erstellers hinterlegt — Neuigkeit kann nicht gesendet werden"

export const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Nachricht darf nicht leer sein")
  .max(MAX_COMMENT_BODY_LENGTH)

export const addCommentInputSchema = z
  .object({
    bugReportId: z.string().min(1),
    body: commentBodySchema,
    kind: z.enum(BUG_REPORT_COMMENT_KIND_VALUES),
    notifyReporter: z.boolean().optional(),
    purpose: z.enum(BUG_REPORT_COMMENT_PURPOSE_VALUES).optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.kind === BUG_REPORT_COMMENT_KIND_OPTIONS.internal &&
      value.notifyReporter
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Interne Notizen werden nicht an den Ersteller gesendet",
      })
    }
  })

export interface CommentFollowUpPlan {
  notifyReporter: boolean
  purpose: BugReportCommentPurpose
  nextStatus: typeof BUG_REPORT_STATUS_OPTIONS.needsInfo | null
}

export function resolveCommentFollowUp(input: {
  kind: string
  notifyReporter?: boolean
  purpose?: BugReportCommentPurpose
  status: string
}): CommentFollowUpPlan {
  const purpose = input.purpose ?? BUG_REPORT_COMMENT_PURPOSE_OPTIONS.question
  const notifyReporter =
    input.notifyReporter === true &&
    input.kind === BUG_REPORT_COMMENT_KIND_OPTIONS.toReporter

  if (!notifyReporter) {
    return {
      notifyReporter: false,
      purpose,
      nextStatus: null,
    }
  }

  switch (purpose) {
    case BUG_REPORT_COMMENT_PURPOSE_OPTIONS.info:
      return {
        notifyReporter: true,
        purpose,
        nextStatus: null,
      }
    case BUG_REPORT_COMMENT_PURPOSE_OPTIONS.question: {
      const shouldSetNeedsInfo =
        input.status === BUG_REPORT_STATUS_OPTIONS.open ||
        input.status === BUG_REPORT_STATUS_OPTIONS.inProgress

      return {
        notifyReporter: true,
        purpose,
        nextStatus: shouldSetNeedsInfo
          ? BUG_REPORT_STATUS_OPTIONS.needsInfo
          : null,
      }
    }
    default: {
      const exhaustive: never = purpose
      return exhaustive
    }
  }
}
