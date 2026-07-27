import { API_TOKEN_SCOPES } from "@crikket/shared/constants/api-token"
import { ORPCError } from "@orpc/server"
import { z } from "zod"
import {
  createOrganizationApiToken,
  deleteOrganizationApiToken,
  listOrganizationApiTokens,
  revokeOrganizationApiToken,
  rotateOrganizationApiToken,
} from "../lib/organization-api-token"
import { sessionProcedure } from "./context"
import { requireActiveOrgAdmin } from "./helpers"

const apiTokenIdSchema = z.object({
  tokenId: z.string().min(1),
})

const createApiTokenInputSchema = z.object({
  label: z.string().trim().min(1).max(80),
  scopes: z
    .array(z.enum(API_TOKEN_SCOPES))
    .min(1)
    .max(API_TOKEN_SCOPES.length)
    .optional(),
})

function rethrowApiTokenInputError(error: unknown): never {
  if (error instanceof ORPCError) {
    throw error
  }

  const message = error instanceof Error ? error.message : null
  if (message) {
    throw new ORPCError("BAD_REQUEST", { message })
  }

  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: "Failed to process API token request.",
  })
}

function toApiTokenResponse<
  T extends {
    createdAt: Date
    updatedAt: Date
    lastUsedAt: Date | null
    expiresAt: Date | null
    revokedAt: Date | null
  },
>(record: T) {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt?.toISOString() ?? null,
    lastUsedAt: record.lastUsedAt?.toISOString() ?? null,
    revokedAt: record.revokedAt?.toISOString() ?? null,
    updatedAt: record.updatedAt.toISOString(),
  }
}

export const listApiTokens = sessionProcedure.handler(async ({ context }) => {
  const organizationId = await requireActiveOrgAdmin(context.session)
  const tokens = await listOrganizationApiTokens({ organizationId })
  return tokens.map(toApiTokenResponse)
})

export const createApiToken = sessionProcedure
  .input(createApiTokenInputSchema)
  .handler(async ({ context, input }) => {
    const organizationId = await requireActiveOrgAdmin(context.session)

    try {
      const created = await createOrganizationApiToken({
        createdBy: context.session.user.id,
        label: input.label,
        organizationId,
        scopes: input.scopes,
      })

      return {
        ...toApiTokenResponse(created),
        token: created.token,
      }
    } catch (error) {
      rethrowApiTokenInputError(error)
    }
  })

export const revokeApiToken = sessionProcedure
  .input(apiTokenIdSchema)
  .handler(async ({ context, input }) => {
    const organizationId = await requireActiveOrgAdmin(context.session)
    const revoked = await revokeOrganizationApiToken({
      organizationId,
      tokenId: input.tokenId,
    })

    if (!revoked) {
      throw new ORPCError("NOT_FOUND", { message: "API token not found" })
    }

    return toApiTokenResponse(revoked)
  })

export const deleteApiToken = sessionProcedure
  .input(apiTokenIdSchema)
  .handler(async ({ context, input }) => {
    const organizationId = await requireActiveOrgAdmin(context.session)
    const deleted = await deleteOrganizationApiToken({
      organizationId,
      tokenId: input.tokenId,
    })

    if (!deleted) {
      throw new ORPCError("NOT_FOUND", { message: "API token not found" })
    }

    return { success: true as const }
  })

export const rotateApiToken = sessionProcedure
  .input(apiTokenIdSchema)
  .handler(async ({ context, input }) => {
    const organizationId = await requireActiveOrgAdmin(context.session)
    const rotated = await rotateOrganizationApiToken({
      organizationId,
      tokenId: input.tokenId,
    })

    if (!rotated) {
      throw new ORPCError("NOT_FOUND", { message: "API token not found" })
    }

    return {
      ...toApiTokenResponse(rotated),
      token: rotated.token,
    }
  })
