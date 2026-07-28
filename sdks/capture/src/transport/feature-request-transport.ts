import { TRAILING_SLASHES_REGEX } from "../constants"
import type { CaptureRuntimeConfig } from "../types"

export async function submitFeatureRequest(input: {
  config: CaptureRuntimeConfig
  draft: {
    title: string
    description: string
  }
}): Promise<{ cardPublicId?: string }> {
  const host = input.config.host.replace(TRAILING_SLASHES_REGEX, "")
  const response = await fetch(`${host}/api/embed/feature-requests`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-crikket-public-key": input.config.key,
    },
    body: JSON.stringify({
      title: input.draft.title,
      description: input.draft.description,
      pageUrl:
        typeof window !== "undefined"
          ? window.location.href.slice(0, 2000)
          : "",
      pageTitle:
        typeof document !== "undefined" ? document.title.slice(0, 500) : "",
    }),
    credentials: "omit",
    mode: "cors",
  })

  const payload = (await response.json().catch(() => null)) as {
    cardPublicId?: string
    message?: string
    code?: string
  } | null

  if (!response.ok) {
    throw new Error(
      payload?.message ||
        `Feature request failed with status ${response.status}.`
    )
  }

  return {
    cardPublicId: payload?.cardPublicId,
  }
}
