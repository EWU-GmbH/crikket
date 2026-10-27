import { describe, expect, it } from "bun:test"
import {
  isBugReportReporter,
  shouldExposeBugReportToViewer,
} from "../src/lib/read-access-policy"

describe("shouldExposeBugReportToViewer", () => {
  it("allows ready reports for external viewers", () => {
    expect(
      shouldExposeBugReportToViewer({
        canAccessUnready: false,
        submissionStatus: "ready",
      })
    ).toBeTrue()
  })

  it("hides non-ready reports from external viewers", () => {
    expect(
      shouldExposeBugReportToViewer({
        canAccessUnready: false,
        submissionStatus: "failed",
      })
    ).toBeFalse()
  })

  it("allows internal viewers to inspect non-ready reports", () => {
    expect(
      shouldExposeBugReportToViewer({
        canAccessUnready: true,
        submissionStatus: "failed",
      })
    ).toBeTrue()
  })
})

describe("isBugReportReporter", () => {
  const viewer = {
    id: "user-1",
    email: "Reporter@Example.com",
    emailVerified: true,
  }

  it("matches the reporter user id", () => {
    expect(
      isBugReportReporter({
        viewer,
        reporterId: "user-1",
        reporterEmail: null,
      })
    ).toBeTrue()
  })

  it("matches a verified email case-insensitively", () => {
    expect(
      isBugReportReporter({
        viewer,
        reporterId: null,
        reporterEmail: " reporter@example.com ",
      })
    ).toBeTrue()
  })

  it("rejects an unverified email match", () => {
    expect(
      isBugReportReporter({
        viewer: { ...viewer, emailVerified: false },
        reporterId: null,
        reporterEmail: "reporter@example.com",
      })
    ).toBeFalse()
  })

  it("rejects other people's reports", () => {
    expect(
      isBugReportReporter({
        viewer,
        reporterId: "user-2",
        reporterEmail: "someone@example.com",
      })
    ).toBeFalse()
  })

  it("rejects reports without reporter data", () => {
    expect(
      isBugReportReporter({
        viewer,
        reporterId: null,
        reporterEmail: null,
      })
    ).toBeFalse()
  })

  it("rejects anonymous viewers", () => {
    expect(
      isBugReportReporter({
        viewer: null,
        reporterId: null,
        reporterEmail: "reporter@example.com",
      })
    ).toBeFalse()
  })
})
