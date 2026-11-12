import {
  BUG_REPORT_COMMENT_PURPOSE_OPTIONS,
  type BugReportCommentPurpose,
} from "@crikket/shared/constants/bug-report"
import { limitEmailSubjectTitle, REPORTER_EMAIL_FOOTER } from "./email-copy"

export interface ReporterFollowUpCopy {
  purpose: BugReportCommentPurpose
  subject: string
  preview: string
  heading: string
  intro: string
  title: string
  message: string
  closing: string
  footer: string
  shareUrl?: string
  text: string
}

const QUESTION_HEADING = "Rückfrage zu Ihrer Meldung"
const QUESTION_INTRO = "Zu Ihrer Meldung haben wir eine Rückfrage:"
const QUESTION_CLOSING =
  "Antworten Sie gerne direkt auf diese E-Mail — wir melden uns sobald wie möglich zurück."

const INFO_HEADING = "Neuigkeiten zu Ihrer Meldung"
const INFO_INTRO = "Zu Ihrer Meldung gibt es Neuigkeiten:"
const INFO_CLOSING = "Den aktuellen Stand können Sie in Ihrer Meldung einsehen."

function followUpPhrases(purpose: BugReportCommentPurpose): {
  heading: string
  intro: string
  closing: string
} {
  switch (purpose) {
    case BUG_REPORT_COMMENT_PURPOSE_OPTIONS.question:
      return {
        heading: QUESTION_HEADING,
        intro: QUESTION_INTRO,
        closing: QUESTION_CLOSING,
      }
    case BUG_REPORT_COMMENT_PURPOSE_OPTIONS.info:
      return {
        heading: INFO_HEADING,
        intro: INFO_INTRO,
        closing: INFO_CLOSING,
      }
    default: {
      const exhaustive: never = purpose
      return exhaustive
    }
  }
}

export function buildReporterFollowUpCopy(input: {
  purpose?: BugReportCommentPurpose
  title: string
  message: string
  shareUrl?: string
}): ReporterFollowUpCopy {
  const purpose = input.purpose ?? BUG_REPORT_COMMENT_PURPOSE_OPTIONS.question
  const subjectTitle = limitEmailSubjectTitle(input.title)
  const phrases = followUpPhrases(purpose)
  const { heading, intro, closing } = phrases
  const subject = `${heading}: ${subjectTitle}`
  const textLines = [intro, "", input.title, "", input.message, "", closing]

  if (input.shareUrl) {
    textLines.push("", `Meldung ansehen: ${input.shareUrl}`)
  }

  textLines.push("", REPORTER_EMAIL_FOOTER)

  return {
    purpose,
    subject,
    preview: subject,
    heading,
    intro,
    title: input.title,
    message: input.message,
    closing,
    footer: REPORTER_EMAIL_FOOTER,
    shareUrl: input.shareUrl,
    text: textLines.join("\n"),
  }
}
