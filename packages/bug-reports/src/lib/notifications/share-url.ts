import { env } from "@crikket/env/server"

const TRAILING_SLASHES_REGEX = /\/+$/

export function getPublicAppOrigin(): string | null {
  const origin =
    env.PUBLIC_APP_URL ?? env.CORS_ORIGINS[0] ?? env.BETTER_AUTH_URL
  return origin ? origin.replace(TRAILING_SLASHES_REGEX, "") : null
}

/** Absolute share link for reporter-facing emails (always when origin is configured). */
export function getBugReportShareUrl(reportId: string): string | undefined {
  const origin = getPublicAppOrigin()
  if (!origin) {
    return undefined
  }

  return `${origin}/s/${reportId}`
}
