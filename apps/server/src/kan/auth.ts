import { env } from "@crikket/env/server"
import { timingSafeEqual } from "node:crypto"

function readBearerToken(authorization: string | null): string | null {
  if (!authorization?.startsWith("Bearer ")) {
    return null
  }

  const token = authorization.slice("Bearer ".length).trim()
  return token.length > 0 ? token : null
}

function tokensMatch(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received, "utf8")
  const expectedBuffer = Buffer.from(expected, "utf8")

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  )
}

/** Kan → Crikket REST auth via shared secret (same value as KAN_WEBHOOK_SECRET). */
export function isKanToCrikketAuthorized(request: Request): boolean {
  const secret = env.KAN_WEBHOOK_SECRET?.trim()
  if (!secret) {
    return false
  }

  const token = readBearerToken(request.headers.get("authorization"))
  if (!token) {
    return false
  }

  return tokensMatch(token, secret)
}
