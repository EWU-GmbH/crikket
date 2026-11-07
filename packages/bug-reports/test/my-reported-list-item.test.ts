import { beforeAll, describe, expect, it, mock } from "bun:test"

mock.module("@crikket/env/server", () => ({
  env: {
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/crikket",
    BETTER_AUTH_SECRET: "0123456789abcdef0123456789abcdef",
    BETTER_AUTH_URL: "http://localhost:3000",
    STORAGE_BUCKET: "bug-report-bucket",
    STORAGE_REGION: "us-east-1",
    STORAGE_ENDPOINT: "https://s3.us-east-1.amazonaws.com",
    STORAGE_ACCESS_KEY_ID: "access",
    STORAGE_SECRET_ACCESS_KEY: "secret",
    STORAGE_PUBLIC_URL: "https://cdn.example.com/bug-reports",
  },
}))

mock.module("@crikket/db", () => ({
  db: {},
}))

mock.module("@crikket/shared/lib/errors", () => ({
  reportNonFatalError: () => undefined,
}))

let mapMyReportedBugReportItem: typeof import("../src/lib/my-reported-list-item").mapMyReportedBugReportItem

beforeAll(async () => {
  ;({ mapMyReportedBugReportItem } = await import(
    "../src/lib/my-reported-list-item"
  ))
})

describe("mapMyReportedBugReportItem", () => {
  it("maps screenshot thumbnails and omits reporter fields", async () => {
    const item = await mapMyReportedBugReportItem({
      report: {
        id: "br_shot",
        title: "CDS Suche",
        description: "Filter kaputt",
        metadata: null,
        captureKey: "organizations/cds/bug-reports/br_shot/capture/shot.png",
        attachmentType: "screenshot",
        status: "resolved",
        priority: "medium",
        createdAt: new Date("2026-10-22T10:00:00.000Z"),
        updatedAt: new Date("2026-10-22T11:00:00.000Z"),
        organization: { name: "CDS" },
      },
      resolveCaptureUrl: async () => "https://cdn.example/shot.png",
    })

    expect(item).toEqual({
      id: "br_shot",
      title: "CDS Suche",
      description: "Filter kaputt",
      status: "resolved",
      priority: "medium",
      organizationName: "CDS",
      duration: "0:00",
      thumbnail: "https://cdn.example/shot.png",
      attachmentUrl: "https://cdn.example/shot.png",
      attachmentType: "screenshot",
      createdAt: "2026-10-22T10:00:00.000Z",
      updatedAt: "2026-10-22T11:00:00.000Z",
    })
    expect(item).not.toHaveProperty("reporterEmail")
  })

  it("keeps video cards readable without a stored thumbnail", async () => {
    const item = await mapMyReportedBugReportItem({
      report: {
        id: "br_video",
        title: "Bewerbungstool Aufnahme",
        description: null,
        metadata: { duration: "0:40" },
        captureKey: "organizations/bt/bug-reports/br_video/capture/clip.webm",
        attachmentType: "video",
        status: "open",
        priority: "none",
        createdAt: new Date("2026-09-08T06:18:34.000Z"),
        updatedAt: new Date("2026-09-08T06:18:34.000Z"),
        organization: { name: "Bewerbungstool" },
      },
      resolveCaptureUrl: async () => "https://cdn.example/clip.webm",
    })

    expect(item.thumbnail).toBeUndefined()
    expect(item.attachmentType).toBe("video")
    expect(item.attachmentUrl).toBe("https://cdn.example/clip.webm")
    expect(item.duration).toBe("0:40")
    expect(item.organizationName).toBe("Bewerbungstool")
  })

  it("supports tickets without any capture attachment", async () => {
    const item = await mapMyReportedBugReportItem({
      report: {
        id: "br_text",
        title: "Nur Text",
        description: null,
        metadata: null,
        captureKey: null,
        attachmentType: null,
        status: "closed",
        priority: "low",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        organization: { name: "CDS" },
      },
      resolveCaptureUrl: async () => null,
    })

    expect(item.attachmentType).toBeUndefined()
    expect(item.thumbnail).toBeUndefined()
    expect(item.attachmentUrl).toBeUndefined()
    expect(item.title).toBe("Nur Text")
    expect(item.status).toBe("closed")
  })
})
