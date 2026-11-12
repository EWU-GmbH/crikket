import { describe, expect, it } from "bun:test"
import { BUG_REPORT_STATUS_OPTIONS } from "@crikket/shared/constants/bug-report"
import {
  addCommentInputSchema,
  MISSING_REPORTER_EMAIL_QUESTION_MESSAGE,
  resolveCommentFollowUp,
} from "../src/lib/comment-follow-up"
import { buildReporterFollowUpCopy } from "../src/lib/notifications/reporter-follow-up-copy"

const LEGACY_QUESTION = {
  bugReportId: "rep_1",
  body: "Welche Browserversion?",
  kind: "to_reporter" as const,
  notifyReporter: true,
}

describe("addComment backward compatibility", () => {
  it("keeps the missing-email error for a question", () => {
    expect(MISSING_REPORTER_EMAIL_QUESTION_MESSAGE).toBe(
      "Keine E-Mail-Adresse des Erstellers hinterlegt — Rückfrage kann nicht gesendet werden"
    )
  })

  it("rejects an internal note that would notify the reporter", () => {
    expect(() =>
      addCommentInputSchema.parse({
        bugReportId: "rep_1",
        body: "Nur für uns",
        kind: "internal",
        notifyReporter: true,
      })
    ).toThrow()
  })

  it("stores an internal note without mail or status change", () => {
    const parsed = addCommentInputSchema.parse({
      bugReportId: "rep_1",
      body: "Nur für uns",
      kind: "internal",
    })

    expect(parsed.purpose).toBeUndefined()
    expect(
      resolveCommentFollowUp({
        kind: parsed.kind,
        notifyReporter: parsed.notifyReporter,
        purpose: parsed.purpose,
        status: BUG_REPORT_STATUS_OPTIONS.open,
      })
    ).toEqual({
      notifyReporter: false,
      purpose: "question",
      nextStatus: null,
    })
  })

  it("treats to_reporter plus notifyReporter as a question and sets needs_info", () => {
    const parsed = addCommentInputSchema.parse(LEGACY_QUESTION)

    expect(parsed.purpose).toBeUndefined()
    expect(
      resolveCommentFollowUp({
        kind: parsed.kind,
        notifyReporter: parsed.notifyReporter,
        purpose: parsed.purpose,
        status: BUG_REPORT_STATUS_OPTIONS.open,
      })
    ).toEqual({
      notifyReporter: true,
      purpose: "question",
      nextStatus: "needs_info",
    })
    expect(
      resolveCommentFollowUp({
        kind: parsed.kind,
        notifyReporter: parsed.notifyReporter,
        purpose: parsed.purpose,
        status: BUG_REPORT_STATUS_OPTIONS.inProgress,
      }).nextStatus
    ).toBe("needs_info")
  })

  it("does not change resolved, closed, or needs_info reports for a question", () => {
    const parsed = addCommentInputSchema.parse(LEGACY_QUESTION)

    for (const status of [
      BUG_REPORT_STATUS_OPTIONS.needsInfo,
      BUG_REPORT_STATUS_OPTIONS.resolved,
      BUG_REPORT_STATUS_OPTIONS.closed,
    ]) {
      expect(
        resolveCommentFollowUp({
          kind: parsed.kind,
          notifyReporter: parsed.notifyReporter,
          purpose: parsed.purpose,
          status,
        }).nextStatus
      ).toBeNull()
    }
  })

  it("does not notify or change status when notifyReporter is omitted or false", () => {
    for (const notifyReporter of [undefined, false]) {
      const parsed = addCommentInputSchema.parse({
        bugReportId: "rep_1",
        body: "Sichtbarer Kommentar",
        kind: "to_reporter",
        notifyReporter,
      })

      expect(
        resolveCommentFollowUp({
          kind: parsed.kind,
          notifyReporter: parsed.notifyReporter,
          purpose: parsed.purpose,
          status: BUG_REPORT_STATUS_OPTIONS.open,
        })
      ).toMatchObject({
        notifyReporter: false,
        nextStatus: null,
      })
    }
  })

  it("keeps the existing question mail text", () => {
    const copy = buildReporterFollowUpCopy({
      title: "Login kaputt",
      message: "Welche Browserversion?",
      shareUrl: "https://report.ewu.tools/s/abc",
    })

    expect(copy.purpose).toBe("question")
    expect(copy.subject).toBe("Rückfrage zu Ihrer Meldung: Login kaputt")
    expect(copy.text).toBe(
      [
        "Zu Ihrer Meldung haben wir eine Rückfrage:",
        "",
        "Login kaputt",
        "",
        "Welche Browserversion?",
        "",
        "Antworten Sie gerne direkt auf diese E-Mail — wir melden uns sobald wie möglich zurück.",
        "",
        "Meldung ansehen: https://report.ewu.tools/s/abc",
        "",
        "Sie erhalten diese E-Mail, weil Sie diese Meldung über das Feedback-Widget eingereicht und Ihre E-Mail-Adresse angegeben haben.",
      ].join("\n")
    )
    expect(absoluteUrls(copy.text)).toEqual(["https://report.ewu.tools/s/abc"])
  })
})

describe("info comments", () => {
  it("notifies without changing an open report", () => {
    const parsed = addCommentInputSchema.parse({
      ...LEGACY_QUESTION,
      purpose: "info",
    })

    expect(
      resolveCommentFollowUp({
        kind: parsed.kind,
        notifyReporter: parsed.notifyReporter,
        purpose: parsed.purpose,
        status: BUG_REPORT_STATUS_OPTIONS.open,
      })
    ).toEqual({
      notifyReporter: true,
      purpose: "info",
      nextStatus: null,
    })
    expect(
      resolveCommentFollowUp({
        kind: parsed.kind,
        notifyReporter: true,
        purpose: "info",
        status: BUG_REPORT_STATUS_OPTIONS.inProgress,
      }).nextStatus
    ).toBeNull()
  })

  it("uses the news subject and does not add attachment links", () => {
    const copy = buildReporterFollowUpCopy({
      purpose: "info",
      title: "Login kaputt",
      message: "Der Fix ist live.",
      shareUrl: "https://report.ewu.tools/s/abc",
    })

    expect(copy.subject).toBe("Neuigkeiten zu Ihrer Meldung: Login kaputt")
    expect(copy.heading).toBe("Neuigkeiten zu Ihrer Meldung")
    expect(copy.intro).toBe("Zu Ihrer Meldung gibt es Neuigkeiten:")
    expect(copy.closing).toBe(
      "Den aktuellen Stand können Sie in Ihrer Meldung einsehen."
    )
    expect(copy.text).toContain("Der Fix ist live.")
    expect(copy.text).not.toContain("Rückfrage")
    expect(absoluteUrls(copy.text)).toEqual(["https://report.ewu.tools/s/abc"])
  })
})

function absoluteUrls(text: string): string[] {
  return text.match(/https?:\/\/\S+/g) ?? []
}
