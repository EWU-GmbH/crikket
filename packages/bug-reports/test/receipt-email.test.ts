import { describe, expect, it } from "bun:test"
import { buildReceiptEmailCopy } from "../src/lib/notifications/receipt-email-copy"
import {
  decideReceiptEmail,
  isReporterReceiptEmailEnabled,
} from "../src/lib/notifications/receipt-policy"

function absoluteUrls(text: string): string[] {
  return text.match(/https?:\/\/\S+/g) ?? []
}

describe("receipt email policy", () => {
  it("stays off unless the organization flag is exactly true", () => {
    expect(isReporterReceiptEmailEnabled(undefined)).toBeFalse()
    expect(isReporterReceiptEmailEnabled(null)).toBeFalse()
    expect(isReporterReceiptEmailEnabled(false)).toBeFalse()
    expect(isReporterReceiptEmailEnabled(true)).toBeTrue()
  })

  it("does not send without a reporter email or after the marker is set", () => {
    expect(
      decideReceiptEmail({
        alreadyNotified: false,
        organizationEnabled: true,
        reporterEmail: "  ",
      })
    ).toBe("skip")
    expect(
      decideReceiptEmail({
        alreadyNotified: false,
        organizationEnabled: true,
        reporterEmail: null,
      })
    ).toBe("skip")
    expect(
      decideReceiptEmail({
        alreadyNotified: true,
        organizationEnabled: true,
        reporterEmail: "melder@example.com",
      })
    ).toBe("skip")
  })

  it("claims without sending while the organization flag is off", () => {
    expect(
      decideReceiptEmail({
        alreadyNotified: false,
        organizationEnabled: false,
        reporterEmail: "melder@example.com",
      })
    ).toBe("claim-without-send")
  })

  it("sends once when the flag is on and an address is present", () => {
    expect(
      decideReceiptEmail({
        alreadyNotified: false,
        organizationEnabled: true,
        reporterEmail: " melder@example.com ",
      })
    ).toBe("send")
  })
})

describe("receipt email copy", () => {
  it("contains only the share link and the account links", () => {
    const copy = buildReceiptEmailCopy({
      title: "Login kaputt",
      shareUrl: "https://report.ewu.tools/s/abc",
      registerUrl: "https://report.ewu.tools/register",
      loginUrl: "https://report.ewu.tools/login",
    })

    expect(copy.subject).toBe("Ihre Meldung ist eingegangen: Login kaputt")
    expect(copy.heading).toBe("Ihre Meldung ist eingegangen")
    expect(copy.intro).toBe("Ihre Meldung ist eingegangen:")
    expect(copy.accountHint).toBe(
      "Mit derselben E-Mail-Adresse können Sie sich unter /register registrieren oder unter /login anmelden und die Meldung unter „Meine Meldungen“ verfolgen."
    )
    expect(copy.text).toContain(
      "Meldung ansehen: https://report.ewu.tools/s/abc"
    )
    expect(absoluteUrls(copy.text).sort()).toEqual([
      "https://report.ewu.tools/login",
      "https://report.ewu.tools/register",
      "https://report.ewu.tools/s/abc",
    ])
    expect(copy.text).not.toContain("X-Amz-")
    expect(copy.text).not.toContain("screenshot")
    expect(copy.text).not.toContain("signature=")
  })
})
