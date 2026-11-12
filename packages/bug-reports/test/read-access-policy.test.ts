import { describe, expect, it } from "bun:test"
import {
  canViewReporterFacingComments,
  isBugReportReporter,
  projectReporterFacingComments,
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

const shareComments = [
  {
    id: "public-note",
    body: "Wir haben den Fix ausgerollt.",
    createdAt: "2026-11-12T14:00:00.000Z",
    kind: "to_reporter",
    authorEmail: "staff@ewu.tools",
    organizationName: "EWU",
  },
  {
    id: "secret-note",
    body: "Intern: Kunde ist ungeduldig.",
    createdAt: "2026-11-12T14:05:00.000Z",
    kind: "internal",
    authorEmail: "staff@ewu.tools",
    organizationName: "EWU",
  },
] as const

describe("reporter-facing comments on /s/<id>", () => {
  it("shows to_reporter comments to the verified reporter and hides internal ones", () => {
    const allowed = canViewReporterFacingComments({
      isOrganizationViewer: false,
      reporterEmail: "reporter@example.com",
      reporterId: null,
      viewer: {
        id: "user-1",
        email: "Reporter@Example.com",
        emailVerified: true,
      },
    })
    const visible = projectReporterFacingComments({
      allowed,
      comments: shareComments,
    })

    expect(visible).toEqual([
      {
        id: "public-note",
        body: "Wir haben den Fix ausgerollt.",
        createdAt: "2026-11-12T14:00:00.000Z",
      },
    ])
    expect(visible[0]).not.toHaveProperty("authorEmail")
    expect(visible[0]).not.toHaveProperty("organizationName")
    expect(visible[0]).not.toHaveProperty("kind")
  })

  it("matches the reporter by user id", () => {
    expect(
      canViewReporterFacingComments({
        isOrganizationViewer: false,
        reporterEmail: null,
        reporterId: "user-1",
        viewer: {
          id: "user-1",
          email: "other@example.com",
          emailVerified: false,
        },
      })
    ).toBeTrue()
  })

  it("shows to_reporter comments to an organization member who is not the reporter", () => {
    const visible = projectReporterFacingComments({
      allowed: canViewReporterFacingComments({
        isOrganizationViewer: true,
        reporterEmail: "reporter@example.com",
        reporterId: "reporter",
        viewer: {
          id: "staff",
          email: "staff@ewu.tools",
          emailVerified: true,
        },
      }),
      comments: shareComments,
    })

    expect(visible.map((comment) => comment.id)).toEqual(["public-note"])
  })

  it("shows nothing to anonymous visitors, even on a public report", () => {
    const allowed = canViewReporterFacingComments({
      isOrganizationViewer: false,
      reporterEmail: "reporter@example.com",
      reporterId: null,
      viewer: null,
    })

    expect(allowed).toBeFalse()
    expect(
      projectReporterFacingComments({
        allowed,
        comments: shareComments,
      })
    ).toEqual([])
  })

  it("shows nothing to a signed-in stranger", () => {
    expect(
      projectReporterFacingComments({
        allowed: canViewReporterFacingComments({
          isOrganizationViewer: false,
          reporterEmail: "reporter@example.com",
          reporterId: "reporter",
          viewer: {
            id: "stranger",
            email: "stranger@example.com",
            emailVerified: true,
          },
        }),
        comments: shareComments,
      })
    ).toEqual([])
  })

  it("shows nothing when the matching email is not verified", () => {
    expect(
      canViewReporterFacingComments({
        isOrganizationViewer: false,
        reporterEmail: "reporter@example.com",
        reporterId: null,
        viewer: {
          id: "user-1",
          email: "reporter@example.com",
          emailVerified: false,
        },
      })
    ).toBeFalse()
  })
})
