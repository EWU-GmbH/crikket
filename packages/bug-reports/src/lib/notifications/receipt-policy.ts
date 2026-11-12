export type ReceiptEmailDecision = "skip" | "claim-without-send" | "send"

export function isReporterReceiptEmailEnabled(
  value: boolean | null | undefined
): boolean {
  return value === true
}

/**
 * One decision per report.
 * Empty addresses and reports that were already marked are left untouched.
 * A disabled organization still claims the marker so a later retry, after the
 * flag is turned on, does not send a late receipt.
 */
export function decideReceiptEmail(input: {
  alreadyNotified: boolean
  organizationEnabled: boolean
  reporterEmail: string | null | undefined
}): ReceiptEmailDecision {
  if (input.alreadyNotified) {
    return "skip"
  }

  if ((input.reporterEmail?.trim() ?? "").length === 0) {
    return "skip"
  }

  if (!input.organizationEnabled) {
    return "claim-without-send"
  }

  return "send"
}
