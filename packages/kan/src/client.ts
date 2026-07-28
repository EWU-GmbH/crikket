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

export function isKanIntegrationEnabled(): boolean {
  return Boolean(
    env.KAN_API_KEY?.trim() &&
      env.KAN_BASE_URL?.trim() &&
      (env.KAN_BUGS_LIST_PUBLIC_ID?.trim() ||
        env.KAN_FEATURE_REQUESTS_LIST_PUBLIC_ID?.trim())
  )
}

export function getKanBugsListPublicId(): string | null {
  return env.KAN_BUGS_LIST_PUBLIC_ID?.trim() || null
}

export function getKanFeatureRequestsListPublicId(): string | null {
  return env.KAN_FEATURE_REQUESTS_LIST_PUBLIC_ID?.trim() || null
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
