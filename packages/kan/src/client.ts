import { env } from "@crikket/env/server"

const TRAILING_SLASHES_REGEX = /\/+$/

export interface CreateKanCardInput {
  title: string
  description?: string
  listPublicId: string
}

export interface CreateKanCardResult {
  publicId: string
}

export type KanListKind = "bugs" | "featureRequests"

export type KanDoneListKind = "bugsDone" | "featureRequestsDone"

type KanOrgListsConfig = Record<
  string,
  Partial<Record<KanListKind | KanDoneListKind, string>>
>

let cachedOrgListsConfig: KanOrgListsConfig | null | undefined

function getKanOrgListsConfig(): KanOrgListsConfig | null {
  if (cachedOrgListsConfig !== undefined) {
    return cachedOrgListsConfig
  }

  const raw = env.KAN_ORG_LISTS_JSON?.trim()
  if (!raw) {
    cachedOrgListsConfig = null
    return cachedOrgListsConfig
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      console.error("[kan] KAN_ORG_LISTS_JSON must be a JSON object")
      cachedOrgListsConfig = null
      return cachedOrgListsConfig
    }
    cachedOrgListsConfig = parsed as KanOrgListsConfig
  } catch (error) {
    console.error("[kan] KAN_ORG_LISTS_JSON could not be parsed", error)
    cachedOrgListsConfig = null
  }

  return cachedOrgListsConfig
}

export function isKanIntegrationEnabled(): boolean {
  return Boolean(
    env.KAN_API_KEY?.trim() &&
      env.KAN_BASE_URL?.trim() &&
      (env.KAN_BUGS_LIST_PUBLIC_ID?.trim() ||
        env.KAN_FEATURE_REQUESTS_LIST_PUBLIC_ID?.trim() ||
        getKanOrgListsConfig())
  )
}

export function getKanBugsListPublicId(): string | null {
  return env.KAN_BUGS_LIST_PUBLIC_ID?.trim() || null
}

export function getKanFeatureRequestsListPublicId(): string | null {
  return env.KAN_FEATURE_REQUESTS_LIST_PUBLIC_ID?.trim() || null
}

export function getKanBugsDoneListPublicId(): string | null {
  return env.KAN_BUGS_DONE_LIST_PUBLIC_ID?.trim() || null
}

export function getKanFeatureRequestsDoneListPublicId(): string | null {
  return env.KAN_FEATURE_REQUESTS_DONE_LIST_PUBLIC_ID?.trim() || null
}

const DONE_LIST_KIND_BY_LIST_KIND: Record<KanListKind, KanDoneListKind> = {
  bugs: "bugsDone",
  featureRequests: "featureRequestsDone",
}

/**
 * Resolve the target list for an organization. Per-org entries from
 * KAN_ORG_LISTS_JSON win; the global KAN_*_LIST_PUBLIC_ID vars are the fallback.
 */
export function getKanListPublicIdForOrganization(input: {
  kind: KanListKind
  organizationId: string
}): string | null {
  const orgListPublicId =
    getKanOrgListsConfig()?.[input.organizationId]?.[input.kind]?.trim()
  if (orgListPublicId) {
    return orgListPublicId
  }

  return input.kind === "bugs"
    ? getKanBugsListPublicId()
    : getKanFeatureRequestsListPublicId()
}

/**
 * Resolve the "Done" list for an organization. Per-org entries
 * ("bugsDone" / "featureRequestsDone" in KAN_ORG_LISTS_JSON) win; the global
 * KAN_*_DONE_LIST_PUBLIC_ID vars are the fallback.
 */
export function getKanDoneListPublicIdForOrganization(input: {
  kind: KanListKind
  organizationId: string
}): string | null {
  const doneKind = DONE_LIST_KIND_BY_LIST_KIND[input.kind]
  const orgDoneListPublicId =
    getKanOrgListsConfig()?.[input.organizationId]?.[doneKind]?.trim()
  if (orgDoneListPublicId) {
    return orgDoneListPublicId
  }

  return input.kind === "bugs"
    ? getKanBugsDoneListPublicId()
    : getKanFeatureRequestsDoneListPublicId()
}

/** All configured "Done" list publicIds (global + per-org), for webhook matching. */
export function getAllKanDoneListPublicIds(): string[] {
  const ids = new Set<string>()
  for (const id of [
    getKanBugsDoneListPublicId(),
    getKanFeatureRequestsDoneListPublicId(),
  ]) {
    if (id) {
      ids.add(id)
    }
  }

  const orgConfig = getKanOrgListsConfig()
  if (orgConfig) {
    for (const orgLists of Object.values(orgConfig)) {
      for (const kind of ["bugsDone", "featureRequestsDone"] as const) {
        const id = orgLists[kind]?.trim()
        if (id) {
          ids.add(id)
        }
      }
    }
  }

  return [...ids]
}

/**
 * Create a card on the EWU Kan board.
 * Uses server-side KAN_API_KEY only — never call from the browser/widget.
 */
export async function createKanCard(
  input: CreateKanCardInput
): Promise<CreateKanCardResult | null> {
  const apiKey = env.KAN_API_KEY?.trim()
  const baseUrl = env.KAN_BASE_URL?.trim()?.replace(TRAILING_SLASHES_REGEX, "")

  if (!(apiKey && baseUrl && input.listPublicId.trim())) {
    return null
  }

  const title = input.title.trim().slice(0, 200) || "Untitled"
  const description = (input.description ?? "").trim().slice(0, 8000)

  const response = await fetch(`${baseUrl}/api/v1/cards`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      description,
      listPublicId: input.listPublicId,
      labelPublicIds: [],
      memberPublicIds: [],
      position: "end",
    }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(
      `Kan card create failed (${response.status}): ${body.slice(0, 500)}`
    )
  }

  const data = (await response.json()) as { publicId?: string }
  if (!data.publicId) {
    throw new Error("Kan card create returned no publicId")
  }

  return { publicId: data.publicId }
}

/** Fire-and-forget wrapper so Kan outages never block Crikket flows. */
export function createKanCardInBackground(
  input: CreateKanCardInput,
  context: string
): void {
  createKanCard(input).catch((error: unknown) => {
    console.error(`[kan] ${context} failed`, error)
  })
}

export interface MoveKanCardInput {
  cardPublicId: string
  listPublicId: string
}

/**
 * Move a card to another list via PUT /api/v1/cards/{cardPublicId}.
 * Returns true when the card was moved, false when integration is unconfigured.
 */
export async function moveKanCardToList(
  input: MoveKanCardInput
): Promise<boolean> {
  const apiKey = env.KAN_API_KEY?.trim()
  const baseUrl = env.KAN_BASE_URL?.trim()?.replace(TRAILING_SLASHES_REGEX, "")

  if (!(apiKey && baseUrl && input.cardPublicId.trim() && input.listPublicId)) {
    return false
  }

  const response = await fetch(
    `${baseUrl}/api/v1/cards/${encodeURIComponent(input.cardPublicId.trim())}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        listPublicId: input.listPublicId,
      }),
    }
  )

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    throw new Error(
      `Kan card move failed (${response.status}): ${body.slice(0, 500)}`
    )
  }

  return true
}

/** Fire-and-forget wrapper so Kan outages never block Crikket flows. */
export function moveKanCardToListInBackground(
  input: MoveKanCardInput,
  context: string
): void {
  moveKanCardToList(input).catch((error: unknown) => {
    console.error(`[kan] ${context} failed`, error)
  })
}
