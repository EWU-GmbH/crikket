import { db } from "@crikket/db"
import { member } from "@crikket/db/schema/auth"
import {
  API_TOKEN_SCOPE_OPTIONS,
  type ApiTokenScope,
} from "@crikket/shared/constants/api-token"
import { ORPCError } from "@orpc/server"
import { and, eq } from "drizzle-orm"

import {
  apiTokenHasScope,
  type ResolvedApiTokenContext,
} from "../lib/organization-api-token"
import type { SessionContext } from "../lib/utils"

export function requireActiveOrgId(session: SessionContext): string {
  const activeOrgId = session.session.activeOrganizationId
  if (!activeOrgId) {
    throw new ORPCError("BAD_REQUEST", { message: "No active organization" })
  }

  return activeOrgId
}

export function requireOrganizationId(input: {
  apiToken?: ResolvedApiTokenContext
  session?: SessionContext
}): string {
  if (input.apiToken) {
    return input.apiToken.organizationId
  }

  if (!input.session) {
    throw new ORPCError("UNAUTHORIZED")
  }

  return requireActiveOrgId(input.session)
}

export function requireApiTokenScope(
  apiToken: ResolvedApiTokenContext | undefined,
  scope: ApiTokenScope
): void {
  if (!apiToken) {
    return
  }

  if (!apiTokenHasScope(apiToken, scope)) {
    throw new ORPCError("FORBIDDEN", {
      message: `API token is missing required scope: ${scope}`,
    })
  }
}

export function requireBugReportsReadAccess(input: {
  apiToken?: ResolvedApiTokenContext
  session?: SessionContext
}): string {
  requireApiTokenScope(input.apiToken, API_TOKEN_SCOPE_OPTIONS.bugReportsRead)
  return requireOrganizationId(input)
}

export function requireBugReportsWriteAccess(input: {
  apiToken?: ResolvedApiTokenContext
  session?: SessionContext
}): string {
  requireApiTokenScope(input.apiToken, API_TOKEN_SCOPE_OPTIONS.bugReportsWrite)
  return requireOrganizationId(input)
}

export async function requireActiveOrgAdmin(
  session: SessionContext
): Promise<string> {
  const activeOrgId = requireActiveOrgId(session)

  const activeMember = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, activeOrgId),
      eq(member.userId, session.user.id)
    ),
    columns: {
      role: true,
    },
  })

  if (!(activeMember && isOrgAdminRole(activeMember.role))) {
    throw new ORPCError("FORBIDDEN", {
      message:
        "Only organization admins or owners can manage organization secrets.",
    })
  }

  return activeOrgId
}

function isOrgAdminRole(role: string): boolean {
  return role === "owner" || role === "admin"
}

export function normalizeTags(tags?: string[]): string[] | undefined {
  if (!tags) {
    return undefined
  }

  const uniqueTags = Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .map((tag) => tag.slice(0, 40))
    )
  )

  return uniqueTags.length > 0 ? uniqueTags : []
}
