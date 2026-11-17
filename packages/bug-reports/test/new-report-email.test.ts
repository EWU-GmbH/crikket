import { describe, expect, it } from "bun:test"
import { render } from "@react-email/render"
import {
  buildNewReportEmailContent,
  MAX_DESCRIPTION_LENGTH,
  readNewReportDeviceInfo,
  readNewReportPageTitle,
  truncateDescription,
} from "../src/lib/notifications/new-report-email-content"
import { NewReportEmailTemplate } from "../src/lib/notifications/templates/new-report-template"

const SUBMITTED_AT = new Date("2026-11-17T09:30:00Z")

function detailValue(
  content: ReturnType<typeof buildNewReportEmailContent>,
  label: string
): string | undefined {
  return content.details.find((detail) => detail.label === label)?.value
}

describe("new report email content", () => {
  it("includes all available fields for a bug report", () => {
    const content = buildNewReportEmailContent({
      kind: "bug-report",
      title: "Button reagiert nicht",
      description: "Beim Klick passiert nichts.",
      priority: "high",
      reporterLabel: "melder@example.com",
      pageUrl: "https://example.com/checkout",
      pageTitle: "Kasse",
      deviceInfo: { browser: "Chrome 130", os: "macOS", viewport: "1440x900" },
      attachments: { captureType: "screenshot", extraCount: 2 },
      submittedAt: SUBMITTED_AT,
      ticketUrl: "https://report.example.test/s/abc123",
    })

    expect(content.subject).toBe("Neuer Bug Report: Button reagiert nicht")
    expect(detailValue(content, "Typ")).toBe("Bug Report")
    expect(detailValue(content, "Gemeldet von")).toBe("melder@example.com")
    expect(detailValue(content, "Priorität")).toBe("Hoch")
    expect(detailValue(content, "Seite")).toBe(
      "Kasse (https://example.com/checkout)"
    )
    expect(detailValue(content, "Browser/Gerät")).toBe(
      "Chrome 130 · macOS · 1440x900"
    )
    expect(detailValue(content, "Anhänge")).toBe(
      "Screenshot: ja · weitere Anhänge: 2"
    )
    expect(detailValue(content, "Zeitpunkt")).toContain("17.11.2026")
    expect(detailValue(content, "Zeitpunkt")).toContain("10:30")
    expect(content.ticket?.url).toBe("https://report.example.test/s/abc123")
    expect(content.textBody).toContain(
      "Beschreibung:\nBeim Klick passiert nichts."
    )
    expect(content.textBody).toContain(
      "Meldung im Dashboard öffnen: https://report.example.test/s/abc123"
    )
  })

  it("builds a feature request mail with the Kan link", () => {
    const content = buildNewReportEmailContent({
      kind: "feature-request",
      title: "Unterschreiben nach Fehlerhaften berichten",
      description: "Wunsch des Melders",
      reporterLabel: "anonym (Widget)",
      submittedAt: SUBMITTED_AT,
      ticketUrl: "https://kan.example.test/cards/kancard12345",
    })

    expect(content.subject).toBe(
      "Neuer Feature Request: Unterschreiben nach Fehlerhaften berichten"
    )
    expect(detailValue(content, "Typ")).toBe("Feature Request")
    expect(content.ticket?.label).toBe("Feature Request im Kan-Board öffnen")
    expect(content.textBody).toContain("Wunsch des Melders")
  })

  it("omits missing optional fields instead of printing placeholders", () => {
    const content = buildNewReportEmailContent({
      kind: "bug-report",
      title: "Nur Titel",
      priority: "none",
      reporterLabel: "anonym (Widget)",
      pageUrl: "   ",
      pageTitle: null,
      deviceInfo: { browser: "  ", os: null },
      attachments: null,
      description: "  \n ",
      submittedAt: SUBMITTED_AT,
    })

    const labels = content.details.map((detail) => detail.label)
    expect(labels).toEqual(["Typ", "Gemeldet von", "Zeitpunkt"])
    expect(content.description).toBeNull()
    expect(content.ticket).toBeNull()
    expect(content.textBody).not.toContain("Beschreibung:")
    expect(content.textBody).not.toContain("undefined")
    expect(content.textBody).not.toContain("null")
  })

  it("reports a missing capture and no extra attachments explicitly", () => {
    const content = buildNewReportEmailContent({
      kind: "bug-report",
      title: "Ohne Anhang",
      reporterLabel: "x",
      attachments: { captureType: null, extraCount: 0 },
      submittedAt: SUBMITTED_AT,
    })

    expect(detailValue(content, "Anhänge")).toBe(
      "Screenshot: nein · weitere Anhänge: keine"
    )
  })

  it("labels video captures", () => {
    const content = buildNewReportEmailContent({
      kind: "bug-report",
      title: "Video",
      reporterLabel: "x",
      attachments: { captureType: "video", extraCount: 0 },
      submittedAt: SUBMITTED_AT,
    })

    expect(detailValue(content, "Anhänge")).toBe(
      "Video: ja · weitere Anhänge: keine"
    )
  })

  it("drops ticket links that are not http(s)", () => {
    const content = buildNewReportEmailContent({
      kind: "bug-report",
      title: "x",
      reporterLabel: "x",
      ticketUrl: "javascript:alert(1)",
      submittedAt: SUBMITTED_AT,
    })

    expect(content.ticket).toBeNull()
    expect(content.textBody).not.toContain("javascript:")
  })

  it("keeps the subject on a single line and clipped", () => {
    const content = buildNewReportEmailContent({
      kind: "bug-report",
      title: `Zeile1\r\nBcc: evil@example.com ${"x".repeat(300)}`,
      reporterLabel: "x",
      submittedAt: SUBMITTED_AT,
    })

    expect(content.subject).not.toContain("\n")
    expect(content.subject).not.toContain("\r")
    expect(content.subject.length).toBeLessThanOrEqual(
      "Neuer Bug Report: ".length + 140
    )
    expect(content.subject.endsWith("…")).toBeTrue()
  })
})

describe("description truncation", () => {
  it("leaves text up to the limit untouched", () => {
    const text = "a".repeat(MAX_DESCRIPTION_LENGTH)
    const result = truncateDescription(text)

    expect(result?.truncated).toBeFalse()
    expect(result?.text).toBe(text)
    expect(result?.truncationNote).toBeNull()
  })

  it("truncates long text to ~1500 characters with a note", () => {
    const result = truncateDescription("b".repeat(4000))

    expect(result?.truncated).toBeTrue()
    expect(result?.totalLength).toBe(4000)
    expect(result?.text.length).toBe(MAX_DESCRIPTION_LENGTH + 1)
    expect(result?.text.endsWith("…")).toBeTrue()
    expect(result?.truncationNote).toContain("1500 von 4000 Zeichen")
  })

  it("does not split surrogate pairs", () => {
    const result = truncateDescription("😀".repeat(MAX_DESCRIPTION_LENGTH + 10))

    expect(result?.truncated).toBeTrue()
    expect(result?.text).toBe(`${"😀".repeat(MAX_DESCRIPTION_LENGTH)}…`)
  })

  it("mentions the truncation in the plain-text variant", () => {
    const content = buildNewReportEmailContent({
      kind: "feature-request",
      title: "Lang",
      description: "c".repeat(2000),
      reporterLabel: "x",
      submittedAt: SUBMITTED_AT,
    })

    expect(content.textBody).toContain("Text gekürzt (1500 von 2000 Zeichen)")
    expect(content.textBody).not.toContain("c".repeat(1600))
  })

  it("normalizes line breaks and strips control characters", () => {
    const result = truncateDescription("a\r\n\r\n\r\n\r\nb\u0000c")

    expect(result?.text).toBe("a\n\nbc")
  })
})

describe("metadata readers", () => {
  it("reads page title and device info defensively", () => {
    expect(readNewReportPageTitle({ pageTitle: "Seite" })).toBe("Seite")
    expect(readNewReportPageTitle({ pageTitle: 5 })).toBeUndefined()
    expect(readNewReportPageTitle(null)).toBeUndefined()
    expect(readNewReportDeviceInfo("nope")).toBeNull()
    expect(readNewReportDeviceInfo({ browser: "Firefox", os: 1 })).toEqual({
      browser: "Firefox",
      os: undefined,
      viewport: undefined,
    })
  })
})

describe("new report email template", () => {
  const payload = '<script>alert("x")</script> & <img src=x onerror=1>'

  it("HTML-escapes user supplied content", async () => {
    const content = buildNewReportEmailContent({
      kind: "bug-report",
      title: payload,
      description: payload,
      reporterLabel: payload,
      pageUrl: `https://example.com/?q=${payload}`,
      pageTitle: payload,
      deviceInfo: { browser: payload },
      submittedAt: SUBMITTED_AT,
      ticketUrl: "https://report.example.test/s/abc123",
    })
    const html = await render(NewReportEmailTemplate({ content }))

    expect(html).not.toContain("<script>")
    expect(html).not.toContain("<img src=x")
    expect(html).toContain("&lt;script&gt;")
    expect(html).toContain("&amp;")
  })

  it("renders description, details and the ticket button", async () => {
    const content = buildNewReportEmailContent({
      kind: "feature-request",
      title: "Dark mode",
      description: "Bitte ein dunkles Theme",
      reporterLabel: "melder@example.com",
      submittedAt: SUBMITTED_AT,
      ticketUrl: "https://kan.example.test/cards/kancard12345",
    })
    const html = await render(NewReportEmailTemplate({ content }))

    expect(html).toContain("Bitte ein dunkles Theme")
    expect(html).toContain("Feature Request")
    expect(html).toContain("melder@example.com")
    expect(html).toContain('href="https://kan.example.test/cards/kancard12345"')
    expect(html).toContain("Feature Request im Kan-Board öffnen")
  })

  it("renders without optional sections and shows the truncation note", async () => {
    const minimal = await render(
      NewReportEmailTemplate({
        content: buildNewReportEmailContent({
          kind: "bug-report",
          title: "Nur Titel",
          reporterLabel: "anonym (Widget)",
          submittedAt: SUBMITTED_AT,
        }),
      })
    )
    expect(minimal).toContain("Nur Titel")
    expect(minimal).not.toContain("Beschreibung")
    expect(minimal).not.toContain("<a ")

    const truncated = await render(
      NewReportEmailTemplate({
        content: buildNewReportEmailContent({
          kind: "bug-report",
          title: "Lang",
          description: "d".repeat(3000),
          reporterLabel: "x",
          submittedAt: SUBMITTED_AT,
        }),
      })
    )
    expect(truncated).toContain("Text gekürzt (1500 von 3000 Zeichen)")
  })
})
