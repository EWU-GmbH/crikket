import { afterEach, describe, expect, it } from "bun:test"

import { fetchCaptureServerPolicy } from "../src/transport/capture-policy-transport"
import type { CaptureSubmissionDraft } from "../src/types"
import { validateReviewDraft } from "../src/ui/capture-widget/utils/review-form-schema"
import {
  getReporterEmailError,
  REPORTER_EMAIL_INVALID_MESSAGE,
  REPORTER_EMAIL_REQUIRED_MESSAGE,
} from "../src/ui/utils/reporter-email"
import {
  getCaptureSdk,
  sdkTestState,
  setupCaptureSdkTestHooks,
  waitFor,
} from "./lib/sdk-test-harness"

setupCaptureSdkTestHooks()

const originalFetch = globalThis.fetch

function buildDraft(
  overrides?: Partial<CaptureSubmissionDraft>
): CaptureSubmissionDraft {
  return {
    description: "Button reagiert nicht",
    priority: "medium",
    reporterEmail: "",
    title: "Checkout kaputt",
    visibility: "private",
    ...overrides,
  }
}

describe("reporter email validation (review form)", () => {
  it("keeps the email optional by default", () => {
    expect(validateReviewDraft(buildDraft())).toBeUndefined()
    expect(
      validateReviewDraft(buildDraft({ reporterEmail: undefined }))
    ).toBeUndefined()
    expect(
      validateReviewDraft(buildDraft({ reporterEmail: "   " }))
    ).toBeUndefined()
  })

  it("still rejects a malformed email when optional", () => {
    expect(
      validateReviewDraft(buildDraft({ reporterEmail: "kein-email" }))
    ).toEqual({ reporterEmail: REPORTER_EMAIL_INVALID_MESSAGE })
  })

  it("blocks submit without an email when required", () => {
    const options = { requireReporterEmail: true }

    expect(validateReviewDraft(buildDraft(), options)).toEqual({
      reporterEmail: REPORTER_EMAIL_REQUIRED_MESSAGE,
    })
    expect(
      validateReviewDraft(buildDraft({ reporterEmail: undefined }), options)
    ).toEqual({ reporterEmail: REPORTER_EMAIL_REQUIRED_MESSAGE })
    expect(
      validateReviewDraft(buildDraft({ reporterEmail: "  " }), options)
    ).toEqual({ reporterEmail: REPORTER_EMAIL_REQUIRED_MESSAGE })
  })

  it("blocks submit with a malformed email when required", () => {
    expect(
      validateReviewDraft(buildDraft({ reporterEmail: "a@b" }), {
        requireReporterEmail: true,
      })
    ).toEqual({ reporterEmail: REPORTER_EMAIL_INVALID_MESSAGE })
  })

  it("accepts a valid (prefilled or typed) email when required", () => {
    expect(
      validateReviewDraft(
        buildDraft({ reporterEmail: " melder@example.com " }),
        {
          requireReporterEmail: true,
        }
      )
    ).toBeUndefined()
  })

  it("uses clear German error messages", () => {
    expect(REPORTER_EMAIL_REQUIRED_MESSAGE).toContain("Pflichtfeld")
    expect(REPORTER_EMAIL_INVALID_MESSAGE).toContain("gültige E-Mail-Adresse")
  })
})

describe("reporter email validation (feature request form)", () => {
  it("returns no error for an empty email unless required", () => {
    expect(getReporterEmailError("")).toBeUndefined()
    expect(getReporterEmailError("", { required: true })).toBe(
      REPORTER_EMAIL_REQUIRED_MESSAGE
    )
    expect(
      getReporterEmailError("melder@example.com", { required: true })
    ).toBe(undefined)
    expect(getReporterEmailError("nope", { required: true })).toBe(
      REPORTER_EMAIL_INVALID_MESSAGE
    )
  })
})

describe("capture server policy transport", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  function mockFetch(factory: () => Promise<Response>): string[] {
    const urls: string[] = []
    globalThis.fetch = ((input: Parameters<typeof fetch>[0]) => {
      urls.push(String(input))
      return factory()
    }) as typeof fetch
    return urls
  }

  it("reads requireReporterEmail=true from /api/embed/config", async () => {
    const urls = mockFetch(() =>
      Promise.resolve(Response.json({ requireReporterEmail: true }))
    )

    await expect(
      fetchCaptureServerPolicy({ host: "https://report.example.com/" })
    ).resolves.toEqual({ requireReporterEmail: true })
    expect(urls).toEqual(["https://report.example.com/api/embed/config"])
  })

  it("falls back to optional for missing endpoints, errors and bad payloads", async () => {
    mockFetch(() => Promise.resolve(new Response(null, { status: 404 })))
    await expect(
      fetchCaptureServerPolicy({ host: "https://report.example.com" })
    ).resolves.toEqual({ requireReporterEmail: false })

    mockFetch(() => Promise.reject(new Error("offline")))
    await expect(
      fetchCaptureServerPolicy({ host: "https://report.example.com" })
    ).resolves.toEqual({ requireReporterEmail: false })

    mockFetch(() =>
      Promise.resolve(Response.json({ requireReporterEmail: "true" }))
    )
    await expect(
      fetchCaptureServerPolicy({ host: "https://report.example.com" })
    ).resolves.toEqual({ requireReporterEmail: false })
  })
})

describe("capture runtime server policy sync", () => {
  it("pushes requireReporterEmail=true into the UI when the server requires it", async () => {
    const capture = getCaptureSdk()
    sdkTestState.policyResponse = Response.json({ requireReporterEmail: true })

    capture.init({
      key: "crk_policy",
      host: "https://api.crikket.io",
      reporterEmail: "melder@example.com",
    })
    capture.open()

    await waitFor(() =>
      sdkTestState.uiPatches.some(
        (patch) => patch.requireReporterEmail === true
      )
    )
    await waitFor(() => sdkTestState.uiEmailPrefills.length > 0)
    expect(sdkTestState.uiEmailPrefills).toEqual(["melder@example.com"])
    expect(sdkTestState.policyRequests).toContain(
      "https://api.crikket.io/api/embed/config"
    )
  })

  it("keeps the email optional when the server has no policy endpoint", async () => {
    const capture = getCaptureSdk()

    capture.init({ key: "crk_policy_default", host: "https://api.crikket.io" })
    capture.open()

    await waitFor(() =>
      sdkTestState.uiPatches.some(
        (patch) => patch.requireReporterEmail === false
      )
    )
    expect(
      sdkTestState.uiPatches.some(
        (patch) => patch.requireReporterEmail === true
      )
    ).toBe(false)
  })
})
