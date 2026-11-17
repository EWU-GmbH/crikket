import { TRAILING_SLASHES_REGEX } from "../constants"
import type { CaptureRuntimeConfig, CaptureServerPolicy } from "../types"

const POLICY_FETCH_TIMEOUT_MS = 5000

/**
 * Reads the public widget policy from the server (GET /api/embed/config).
 * Servers without this endpoint (older or upstream builds) and any network
 * failure resolve to the permissive defaults — the server stays authoritative.
 */
export async function fetchCaptureServerPolicy(
  config: Pick<CaptureRuntimeConfig, "host">
): Promise<CaptureServerPolicy> {
  const host = config.host.replace(TRAILING_SLASHES_REGEX, "")
  const defaults: CaptureServerPolicy = { requireReporterEmail: false }

  try {
    const response = await fetch(`${host}/api/embed/config`, {
      credentials: "omit",
      mode: "cors",
      signal: AbortSignal.timeout(POLICY_FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      return defaults
    }

    const payload = (await response.json()) as {
      requireReporterEmail?: unknown
    } | null

    return {
      requireReporterEmail: payload?.requireReporterEmail === true,
    }
  } catch {
    return defaults
  }
}
