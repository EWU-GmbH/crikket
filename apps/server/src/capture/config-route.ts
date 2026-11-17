import { isReporterEmailRequired } from "./reporter-email-policy"
import { buildJsonResponse } from "./shared"

/**
 * Public, non-sensitive widget policy. Lets the static widget script mirror
 * server-side rules (e.g. required reporter email) without a rebuild or any
 * change to the embedding site. The server still enforces every rule itself.
 */
export function handleCaptureConfig(): Response {
  return buildJsonResponse(
    {
      requireReporterEmail: isReporterEmailRequired(),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    }
  )
}
