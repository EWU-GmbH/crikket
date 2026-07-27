import { timingSafeEqual } from "node:crypto"
import { db } from "@crikket/db"
import { organizationApiToken } from "@crikket/db/schema/integration"
import {
  API_TOKEN_SCOPES,
  API_TOKEN_STATUS_OPTIONS,
  type ApiTokenScope,
  type ApiTokenStatus,
  DEFAULT_API_TOKEN_SCOPES,
} from "@crikket/shared/constants/api-token"
import { retryOnUniqueViolation } from "@crikket/shared/lib/server/retry-on-unique-violation"
import { and, desc, eq } from "drizzle-orm"
import { nanoid } from "nanoid"

import { hashApiToken } from "./api-token-crypto"

const API_TOKEN_PREFIX = "crk_api"
const API_TOKEN_RANDOM_LENGTH = 40
const API_TOKEN_DISPLAY_PREFIX_LENGTH = 16

export interface OrganizationApiTokenRecord {
  createdAt: Date
  createdBy: string | null
  expiresAt: Date | null
  id: string
  label: string
  lastUsedAt: Date | null
  organizationId: string
  prefix: string
  revokedAt: Date | null
  scopes: ApiTokenScope[]
  status: ApiTokenStatus
  updatedAt: Date
}

export type CreateOrganizationApiTokenResult = OrganizationApiTokenRecord & {
  token: string
}

export type ResolvedApiTokenContext = {
  createdBy: string | null
  organizationId: string
  scopes: ApiTokenScope[]
  tokenId: string
}

type CreateOrganizationApiTokenInput = {
  createdBy?: string | null
  label: string
  organizationId: string
  scopes?: ApiTokenScope[]
}

function buildApiToken(): string {
  return `${API_TOKEN_PREFIX}_${nanoid(API_TOKEN_RANDOM_LENGTH)}`
}

function buildTokenPrefix(token: string): string {
  return token.slice(0, API_TOKEN_DISPLAY_PREFIX_LENGTH)
}

function hashesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function normalizeLabel(value: string): string {
  return value.trim().slice(0, 80)
}

function normalizeScopes(scopes: Iterable<ApiTokenScope>): ApiTokenScope[] {
  const allowed = new Set<string>(API_TOKEN_SCOPES)
  const normalized = Array.from(
    new Set(
      Array.from(scopes).filter((scope): scope is ApiTokenScope =>
        allowed.has(scope)
      )
    )
  )

  if (normalized.length === 0) {
    throw new Error("At least one valid API token scope is required.")
  }

  return normalized
}

function toOrganizationApiTokenRecord(
  record: typeof organizationApiToken.$inferSelect
): OrganizationApiTokenRecord {
  return {
    createdAt: record.createdAt,
    createdBy: record.createdBy,
    expiresAt: record.expiresAt,
    id: record.id,
    label: record.label,
    lastUsedAt: record.lastUsedAt,
    organizationId: record.organizationId,
    prefix: record.prefix,
    revokedAt: record.revokedAt,
    scopes: normalizeScopes(record.scopes as ApiTokenScope[]),
    status: record.status as ApiTokenStatus,
    updatedAt: record.updatedAt,
  }
}

export function isOrganizationApiTokenActive(
  record: Pick<OrganizationApiTokenRecord, "expiresAt" | "status">
): boolean {
  if (record.status !== API_TOKEN_STATUS_OPTIONS.active) {
    return false
  }

  if (record.expiresAt && record.expiresAt.getTime() <= Date.now()) {
    return false
  }

  return true
}

export function apiTokenHasScope(
  token: Pick<ResolvedApiTokenContext, "scopes">,
  scope: ApiTokenScope
): boolean {
  return token.scopes.includes(scope)
}

export async function listOrganizationApiTokens(input: {
  organizationId: string
}): Promise<OrganizationApiTokenRecord[]> {
  const records = await db.query.organizationApiToken.findMany({
    where: eq(organizationApiToken.organizationId, input.organizationId),
    orderBy: [
      desc(organizationApiToken.updatedAt),
      desc(organizationApiToken.createdAt),
    ],
  })

  return records.map(toOrganizationApiTokenRecord)
}

export function createOrganizationApiToken(
  input: CreateOrganizationApiTokenInput
): Promise<CreateOrganizationApiTokenResult> {
  const label = normalizeLabel(input.label)
  if (!label) {
    throw new Error("API token label is required.")
  }

  const scopes = normalizeScopes(input.scopes ?? DEFAULT_API_TOKEN_SCOPES)

  return retryOnUniqueViolation(async () => {
    const token = buildApiToken()
    const [createdRecord] = await db
      .insert(organizationApiToken)
      .values({
        createdBy: input.createdBy ?? null,
        expiresAt: null,
        id: nanoid(16),
        label,
        organizationId: input.organizationId,
        prefix: buildTokenPrefix(token),
        revokedAt: null,
        scopes,
        status: API_TOKEN_STATUS_OPTIONS.active,
        tokenHash: hashApiToken(token),
      })
      .returning()

    if (!createdRecord) {
      throw new Error("Failed to create organization API token.")
    }

    return {
      ...toOrganizationApiTokenRecord(createdRecord),
      token,
    }
  })
}

export async function revokeOrganizationApiToken(input: {
  organizationId: string
  tokenId: string
}): Promise<OrganizationApiTokenRecord | null> {
  const [updatedRecord] = await db
    .update(organizationApiToken)
    .set({
      revokedAt: new Date(),
      status: API_TOKEN_STATUS_OPTIONS.revoked,
    })
    .where(
      and(
        eq(organizationApiToken.id, input.tokenId),
        eq(organizationApiToken.organizationId, input.organizationId),
        eq(organizationApiToken.status, API_TOKEN_STATUS_OPTIONS.active)
      )
    )
    .returning()

  return updatedRecord ? toOrganizationApiTokenRecord(updatedRecord) : null
}

export async function deleteOrganizationApiToken(input: {
  organizationId: string
  tokenId: string
}): Promise<boolean> {
  const deleted = await db
    .delete(organizationApiToken)
    .where(
      and(
        eq(organizationApiToken.id, input.tokenId),
        eq(organizationApiToken.organizationId, input.organizationId)
      )
    )
    .returning({ id: organizationApiToken.id })

  return deleted.length > 0
}

export async function rotateOrganizationApiToken(input: {
  organizationId: string
  tokenId: string
}): Promise<CreateOrganizationApiTokenResult | null> {
  const existing = await db.query.organizationApiToken.findFirst({
    where: and(
      eq(organizationApiToken.id, input.tokenId),
      eq(organizationApiToken.organizationId, input.organizationId)
    ),
  })

  if (!existing) {
    return null
  }

  return retryOnUniqueViolation(async () => {
    const token = buildApiToken()
    const [updatedRecord] = await db
      .update(organizationApiToken)
      .set({
        prefix: buildTokenPrefix(token),
        revokedAt: null,
        status: API_TOKEN_STATUS_OPTIONS.active,
        tokenHash: hashApiToken(token),
      })
      .where(eq(organizationApiToken.id, existing.id))
      .returning()

    if (!updatedRecord) {
      return null
    }

    return {
      ...toOrganizationApiTokenRecord(updatedRecord),
      token,
    }
  })
}

export async function resolveOrganizationApiToken(
  bearerToken: string
): Promise<ResolvedApiTokenContext | null> {
  const normalizedToken = bearerToken.trim()
  if (!normalizedToken.startsWith(`${API_TOKEN_PREFIX}_`)) {
    return null
  }

  const tokenHash = hashApiToken(normalizedToken)
  const record = await db.query.organizationApiToken.findFirst({
    where: eq(organizationApiToken.tokenHash, tokenHash),
  })

  if (!record) {
    return null
  }

  const mapped = toOrganizationApiTokenRecord(record)
  if (!isOrganizationApiTokenActive(mapped)) {
    return null
  }

  if (!hashesMatch(tokenHash, record.tokenHash)) {
    return null
  }

  return {
    createdBy: mapped.createdBy,
    organizationId: mapped.organizationId,
    scopes: mapped.scopes,
    tokenId: mapped.id,
  }
}

export async function touchOrganizationApiTokenLastUsed(
  tokenId: string
): Promise<void> {
  await db
    .update(organizationApiToken)
    .set({
      lastUsedAt: new Date(),
    })
    .where(eq(organizationApiToken.id, tokenId))
}
