import { env } from "@crikket/env/server"
import { ORPCError } from "@orpc/server"
import { z } from "zod"

export const REPORTER_EMAIL_REQUIRED_REASON_CODE = "reporter_email_required"
export const REPORTER_EMAIL_REQUIRED_MESSAGE =
  "Bitte geben Sie eine gültige E-Mail-Adresse an. Die E-Mail-Adresse ist ein Pflichtfeld."

const reporterEmailSchema = z.email().max(320)

export function isReporterEmailRequired(): boolean {
  return env.CRIKKET_REQUIRE_REPORTER_EMAIL === true
}

/**
 * Rejects widget submissions without a usable reporter email when
 * CRIKKET_REQUIRE_REPORTER_EMAIL is enabled. No-op otherwise.
 */
export function assertReporterEmailIfRequired(
  reporterEmail: string | null | undefined
): void {
  if (!isReporterEmailRequired()) {
    return
  }

  const candidate = reporterEmail?.trim() ?? ""
  if (
    candidate.length > 0 &&
    reporterEmailSchema.safeParse(candidate).success
  ) {
    return
  }

  throw new ORPCError("BAD_REQUEST", {
    data: {
      reasonCode: REPORTER_EMAIL_REQUIRED_REASON_CODE,
    },
    message: REPORTER_EMAIL_REQUIRED_MESSAGE,
  })
}
