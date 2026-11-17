import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test"

type SentMail = Record<string, unknown> & { to: string }

const OWNERS = [
  { email: "owner-a@example.com", userId: "user_a" },
  { email: "owner-b@example.com", userId: "user_b" },
  { email: "owner-c@example.com", userId: "user_c" },
]

const state = {
  failingRecipients: new Set<string>(),
  inserted: [] as Record<string, unknown>[],
  owners: [...OWNERS],
  sent: [] as SentMail[],
  session: null as Record<string, unknown> | null,
}

const envState = {
  BETTER_AUTH_URL: "https://auth.example.test",
  CORS_ORIGINS: [] as string[],
  NODE_ENV: "test",
  PUBLIC_APP_URL: "https://report.example.test/",
}

function createTx() {
  return {
    insert: () => ({
      values: (values: unknown) => {
        state.inserted.push(
          ...(Array.isArray(values) ? values : [values]).map(
            (value) => value as Record<string, unknown>
          )
        )
        return Promise.resolve()
      },
    }),
    delete: () => ({ where: () => Promise.resolve() }),
  }
}

mock.module("@crikket/env/server", () => ({ env: envState }))

mock.module("@crikket/db", () => ({
  db: {
    query: {
      bugReportUploadSession: {
        findFirst: () => Promise.resolve(state.session),
      },
    },
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          where: () => Promise.resolve(state.owners),
        }),
      }),
    }),
    transaction: (callback: (tx: ReturnType<typeof createTx>) => unknown) =>
      Promise.resolve(callback(createTx())),
    update: () => ({
      set: () => ({ where: () => Promise.resolve() }),
    }),
    delete: () => ({ where: () => Promise.resolve() }),
  },
}))

mock.module("@crikket/shared/lib/server/retry-on-unique-violation", () => ({
  retryOnUniqueViolation: <T>(operation: () => Promise<T>) => operation(),
}))

mock.module("@crikket/kan/client", () => ({
  createKanCard: () => Promise.resolve(null),
  getKanListPublicIdForOrganization: () => null,
}))

mock.module("../src/lib/storage", () => ({
  getStorageProvider: () => ({ exists: () => Promise.resolve(true) }),
}))

mock.module("../src/lib/entitlements", () => ({
  assertCreateBugReportEntitlements: () => Promise.resolve(),
}))

mock.module("../src/lib/ingestion-jobs", () => ({
  processBugReportIngestionJob: () => Promise.resolve({ status: "failed" }),
  queueBugReportIngestionJob: () => Promise.resolve({ jobId: "job_1" }),
}))

mock.module("../src/lib/notifications/notify-jira-bug", () => ({
  notifyJiraAboutNewBugInBackground: () => undefined,
}))

mock.module("../src/lib/notifications/notify-receipt", () => ({
  notifyReporterAboutReceiptInBackground: () => undefined,
}))

mock.module("../src/lib/notifications/send-new-report-email", () => ({
  sendNewReportEmail: (input: SentMail) => {
    if (state.failingRecipients.has(input.to)) {
      return Promise.reject(new Error(`resend rejected ${input.to}`))
    }
    state.sent.push(input)
    return Promise.resolve()
  },
}))

let notifyOwnersAboutNewSubmission: typeof import("../src/lib/notifications/notify-new-report").notifyOwnersAboutNewSubmission
let notifyOwnersAboutNewSubmissionInBackground: typeof import("../src/lib/notifications/notify-new-report").notifyOwnersAboutNewSubmissionInBackground
let finalizeBugReportUpload: typeof import("../src/lib/upload-session").finalizeBugReportUpload

beforeAll(async () => {
  ;({
    notifyOwnersAboutNewSubmission,
    notifyOwnersAboutNewSubmissionInBackground,
  } = await import("../src/lib/notifications/notify-new-report"))
  ;({ finalizeBugReportUpload } = await import("../src/lib/upload-session"))
})

afterAll(() => {
  mock.restore()
})

beforeEach(() => {
  state.failingRecipients = new Set()
  state.inserted = []
  state.owners = [...OWNERS]
  state.sent = []
  state.session = null
})

function waitForBackgroundWork(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20))
}

describe("notifyOwnersAboutNewSubmission", () => {
  it("sends one mail per owner and skips the logged-in submitter", async () => {
    await notifyOwnersAboutNewSubmission({
      kind: "bug-report",
      organizationId: "org_1",
      title: "Titel",
      reportId: "br_1",
      excludeUserId: "user_b",
    })

    expect(state.sent.map((mail) => mail.to)).toEqual([
      "owner-a@example.com",
      "owner-c@example.com",
    ])
  })

  it("keeps sending to the remaining owners when one delivery fails and logs the error", async () => {
    state.failingRecipients.add("owner-a@example.com")
    const errorSpy = spyOn(console, "error").mockImplementation(() => undefined)

    try {
      await expect(
        notifyOwnersAboutNewSubmission({
          kind: "feature-request",
          organizationId: "org_1",
          title: "Dark mode",
        })
      ).resolves.toBeUndefined()

      expect(state.sent.map((mail) => mail.to)).toEqual([
        "owner-b@example.com",
        "owner-c@example.com",
      ])
      expect(errorSpy).toHaveBeenCalledTimes(1)
      const [message, error] = errorSpy.mock.calls[0] ?? []
      expect(String(message)).toContain("owner 1/3")
      expect(String(message)).not.toContain("owner-a@example.com")
      expect((error as Error).message).toContain("resend rejected")
    } finally {
      errorSpy.mockRestore()
    }
  })

  it("does not throw when every delivery fails", async () => {
    for (const owner of OWNERS) {
      state.failingRecipients.add(owner.email)
    }
    const errorSpy = spyOn(console, "error").mockImplementation(() => undefined)

    try {
      await expect(
        notifyOwnersAboutNewSubmission({
          kind: "bug-report",
          organizationId: "org_1",
          title: "Titel",
        })
      ).resolves.toBeUndefined()
      expect(state.sent).toHaveLength(0)
      expect(errorSpy).toHaveBeenCalledTimes(OWNERS.length)
    } finally {
      errorSpy.mockRestore()
    }
  })

  it("does nothing without owner recipients", async () => {
    state.owners = []

    await notifyOwnersAboutNewSubmission({
      kind: "bug-report",
      organizationId: "org_1",
      title: "Titel",
    })

    expect(state.sent).toHaveLength(0)
  })

  it("prefers an explicit ticket url and falls back to the bug share link", async () => {
    await notifyOwnersAboutNewSubmission({
      kind: "feature-request",
      organizationId: "org_1",
      ticketUrl: "https://kan.example.test/cards/kancard12345",
      title: "Dark mode",
    })
    await notifyOwnersAboutNewSubmission({
      kind: "bug-report",
      organizationId: "org_1",
      reportId: "br_9",
      title: "Titel",
    })

    expect(state.sent[0]?.ticketUrl).toBe(
      "https://kan.example.test/cards/kancard12345"
    )
    expect(state.sent[3]?.ticketUrl).toBe("https://report.example.test/s/br_9")
  })

  it("runs fire-and-forget without surfacing errors to the caller", async () => {
    state.failingRecipients.add("owner-a@example.com")
    const errorSpy = spyOn(console, "error").mockImplementation(() => undefined)

    try {
      notifyOwnersAboutNewSubmissionInBackground(
        {
          kind: "bug-report",
          organizationId: "org_1",
          title: "Titel",
        },
        "test"
      )
      await waitForBackgroundWork()

      expect(state.sent).toHaveLength(2)
    } finally {
      errorSpy.mockRestore()
    }
  })
})

describe("bug report finalize -> owner notification", () => {
  const SESSION_ID = "br_integration_1"

  function createSession(overrides: Record<string, unknown> = {}) {
    return {
      id: SESSION_ID,
      organizationId: "org_1",
      reporterId: null,
      title: "Button reagiert nicht",
      description: "Beim Klick auf <Speichern> passiert nichts & kein Fehler.",
      priority: "high",
      reporterEmail: "melder@example.com",
      tags: [],
      url: "https://example.com/checkout",
      attachmentType: "screenshot",
      visibility: "private",
      captureKey: "captures/br_integration_1.png",
      captureContentType: "image/png",
      debuggerKey: null,
      metadata: { pageTitle: "Kasse" },
      deviceInfo: { browser: "Chrome 130", os: "macOS", viewport: "1440x900" },
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date("2020-01-01T00:00:00Z"),
      attachments: [
        {
          id: "att_1",
          kind: "screenshot",
          sortOrder: 0,
          filename: "extra-1.png",
          objectKey: "attachments/extra-1.png",
          contentType: "image/png",
        },
        {
          id: "att_2",
          kind: "file",
          sortOrder: 1,
          filename: "log.txt",
          objectKey: "attachments/log.txt",
          contentType: "text/plain",
        },
      ],
      ...overrides,
    }
  }

  it("notifies owners with description, page, device, attachments and finalize time", async () => {
    state.session = createSession()
    const before = Date.now()

    const result = await finalizeBugReportUpload({
      input: {
        id: SESSION_ID,
        captureContentType: "image/png",
        captureSizeBytes: 1234,
      },
      organizationId: "org_1",
    })
    await waitForBackgroundWork()
    const after = Date.now()

    expect(result.shareUrl).toBe(`/s/${SESSION_ID}`)
    expect(state.sent.map((mail) => mail.to)).toEqual(
      OWNERS.map((owner) => owner.email)
    )

    const mail = state.sent[0]
    expect(mail).toMatchObject({
      kind: "bug-report",
      title: "Button reagiert nicht",
      description: "Beim Klick auf <Speichern> passiert nichts & kein Fehler.",
      priority: "high",
      reporterLabel: "melder@example.com",
      pageUrl: "https://example.com/checkout",
      pageTitle: "Kasse",
      deviceInfo: { browser: "Chrome 130", os: "macOS", viewport: "1440x900" },
      attachments: { captureType: "screenshot", extraCount: 2 },
      ticketUrl: `https://report.example.test/s/${SESSION_ID}`,
    })

    const persistedReport = state.inserted.find(
      (row) => row.id === SESSION_ID && "captureUploadedAt" in row
    )
    const submittedAt = mail?.submittedAt
    expect(submittedAt).toBeInstanceOf(Date)
    expect((submittedAt as Date).getTime()).toBeGreaterThanOrEqual(before)
    expect((submittedAt as Date).getTime()).toBeLessThanOrEqual(after)
    expect(submittedAt).toBe(persistedReport?.captureUploadedAt as Date)
  })

  it("reports video captures and sessions without extras or device info", async () => {
    state.session = createSession({
      attachmentType: "video",
      attachments: [],
      deviceInfo: null,
      metadata: null,
      url: null,
      description: null,
      priority: "none",
    })

    await finalizeBugReportUpload({
      input: { id: SESSION_ID },
      organizationId: "org_1",
    })
    await waitForBackgroundWork()

    expect(state.sent[0]).toMatchObject({
      attachments: { captureType: "video", extraCount: 0 },
      pageUrl: null,
      priority: "none",
    })
    expect(state.sent[0]?.description).toBeNull()
    expect(state.sent[0]?.pageTitle).toBeUndefined()
    expect(state.sent[0]?.deviceInfo).toBeNull()
  })

  it("still finalizes the report when an owner mail fails", async () => {
    state.session = createSession()
    state.failingRecipients.add("owner-a@example.com")
    const errorSpy = spyOn(console, "error").mockImplementation(() => undefined)

    try {
      const result = await finalizeBugReportUpload({
        input: { id: SESSION_ID },
        organizationId: "org_1",
      })
      await waitForBackgroundWork()

      expect(result.id).toBe(SESSION_ID)
      expect(state.sent.map((mail) => mail.to)).toEqual([
        "owner-b@example.com",
        "owner-c@example.com",
      ])
    } finally {
      errorSpy.mockRestore()
    }
  })
})
