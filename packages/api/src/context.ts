import { auth } from "@crikket/auth"
import {
  resolveOrganizationApiToken,
  touchOrganizationApiTokenLastUsed,
} from "@crikket/bug-reports/lib/organization-api-token"
import { db } from "@crikket/db"
import { session as authSession, member } from "@crikket/db/schema/auth"
import { reportNonFatalError } from "@crikket/shared/lib/errors"
import { asc, eq } from "drizzle-orm"
import type { Context as HonoContext } from "hono"

export type CreateContextOptions = {
  context: HonoContext
}

const BEARER_SPLIT_PATTERN = /\s+/

function readBearerToken(headers: Headers): string | null {
  const authorization = headers.get("authorization")?.trim()
  if (!authorization) {
    return null
  }

  const [scheme, token] = authorization.split(BEARER_SPLIT_PATTERN, 2)
  if (!(scheme && token) || scheme.toLowerCase() !== "bearer") {
    return null
  }

  return token.trim() || null
}

export async function createContext({ context }: CreateContextOptions) {
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  })

  const sessionId = session?.session.id
  const userId = session?.user.id

  if (session && userId && !session.session.activeOrganizationId) {
    const [fallbackMembership] = await db
      .select({
        organizationId: member.organizationId,
      })
      .from(member)
      .where(eq(member.userId, userId))
      .orderBy(asc(member.createdAt))
      .limit(1)

    const fallbackOrganizationId = fallbackMembership?.organizationId

    if (fallbackOrganizationId) {
      session.session.activeOrganizationId = fallbackOrganizationId

      if (sessionId) {
        await db
          .update(authSession)
          .set({
            activeOrganizationId: fallbackOrganizationId,
          })
          .where(eq(authSession.id, sessionId))
      }
    }
  }

  if (session) {
    return {
      apiToken: undefined,
      session,
    }
  }

  const bearerToken = readBearerToken(context.req.raw.headers)
  if (!bearerToken) {
    return {
      apiToken: undefined,
      session: undefined,
    }
  }

  const apiToken = await resolveOrganizationApiToken(bearerToken)
  if (apiToken) {
    touchOrganizationApiTokenLastUsed(apiToken.tokenId).catch((error) => {
      reportNonFatalError("Failed to update API token lastUsedAt", error, {
        once: true,
      })
    })
  }

  return {
    apiToken: apiToken ?? undefined,
    session: undefined,
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
