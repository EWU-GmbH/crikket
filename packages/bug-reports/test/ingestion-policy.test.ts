import { describe, expect, it } from "bun:test"
import {
  calculateBugReportIngestionRetryDelayMs,
  resolveBugReportIngestionFailureStatus,
} from "../src/lib/ingestion-policy"

describe("bug report ingestion policy", () => {
  it("backs off exponentially and caps the delay", () => {
    expect(calculateBugReportIngestionRetryDelayMs(1)).toBe(60_000)
    expect(calculateBugReportIngestionRetryDelayMs(2)).toBe(120_000)
    expect(calculateBugReportIngestionRetryDelayMs(20)).toBe(86_400_000)
  })

  it("marks max-attempt failures as dead-lettered", () => {
    expect(resolveBugReportIngestionFailureStatus(1)).toBe("failed")
    expect(resolveBugReportIngestionFailureStatus(5)).toBe("dead_letter")
  })
})
