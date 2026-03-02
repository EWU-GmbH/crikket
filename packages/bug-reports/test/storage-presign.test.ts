import { afterAll, beforeAll, describe, expect, it, mock } from "bun:test"

const envState: {
  DATABASE_URL: string
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  STORAGE_BUCKET: string
  STORAGE_REGION: string
  STORAGE_ENDPOINT: string
  STORAGE_ACCESS_KEY_ID: string
  STORAGE_SECRET_ACCESS_KEY: string
  STORAGE_PUBLIC_URL: string | undefined
} = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/crikket",
  BETTER_AUTH_SECRET: "0123456789abcdef0123456789abcdef",
  BETTER_AUTH_URL: "http://localhost:3000",
  STORAGE_BUCKET: "bug-report-bucket",
  STORAGE_REGION: "auto",
  STORAGE_ENDPOINT: "https://example-account.r2.cloudflarestorage.com",
  STORAGE_ACCESS_KEY_ID: "access",
  STORAGE_SECRET_ACCESS_KEY: "secret",
  STORAGE_PUBLIC_URL: undefined,
}

mock.module("@crikket/env/server", () => ({
  env: envState,
}))

mock.module("@crikket/db", () => ({
  db: {
    query: {
      bugReportArtifactCleanup: {
        findMany: async () => [],
        findFirst: async () => null,
      },
    },
    delete: () => ({
      where: async () => undefined,
    }),
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: async () => undefined,
      }),
    }),
  },
}))

mock.module("@crikket/shared/lib/errors", () => ({
  reportNonFatalError: () => undefined,
}))

let createS3StorageProvider: typeof import("../src/lib/storage").createS3StorageProvider

beforeAll(async () => {
  ;({ createS3StorageProvider } = await import("../src/lib/storage"))
})

afterAll(() => {
  mock.restore()
})

describe("createUploadUrl", () => {
  it("does not include flexible checksum query params in presigned upload urls", async () => {
    const storage = createS3StorageProvider({
      provider: "r2",
      bucket: "bug-report-bucket",
      region: "auto",
      endpoint: "https://example-account.r2.cloudflarestorage.com",
      accessKeyId: "access",
      secretAccessKey: "secret",
    })

    const upload = await storage.createUploadUrl({
      filename: "organizations/org_123/bug-reports/br_123/capture/video.webm",
      contentType: "video/webm",
    })

    const parsed = new URL(upload.url)

    expect(parsed.searchParams.has("x-amz-checksum-crc32")).toBeFalse()
    expect(parsed.searchParams.has("x-amz-sdk-checksum-algorithm")).toBeFalse()
  })
})
