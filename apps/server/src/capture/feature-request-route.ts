import {
  createKanCard,
  getKanListPublicIdForOrganization,
} from "@crikket/kan/client"
import { ORPCError } from "@orpc/server"
import { z } from "zod"
import {
  authorizeCaptureSubmitRequest,
  buildJsonResponse,
  toCaptureErrorResponse,
} from "./shared"

const featureRequestInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional().default(""),
  pageUrl: z.string().trim().max(2000).optional(),
  pageTitle: z.string().trim().max(500).optional(),
})

/**
 * Widget feature wishes → Kan "Feature Requests" directly.
 * Does NOT create a Crikket bug report.
 */
export async function handleFeatureRequest(input: {
  request: Request
}): Promise<Response> {
  const route = "/api/embed/feature-requests"
  let keyId: string | null = null
  let origin: string | null = null

  try {
    const authorization = await authorizeCaptureSubmitRequest({
      request: input.request,
      route,
    })
    if (authorization instanceof Response) {
      return authorization
    }

    keyId = authorization.keyId
    origin = authorization.origin

    const body = featureRequestInputSchema.parse(
      (await input.request.json()) as unknown
    )

    const listPublicId = getKanListPublicIdForOrganization({
      kind: "featureRequests",
      organizationId: authorization.organizationId,
    })
    if (!listPublicId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Kan feature-request integration is not configured.",
      })
    }

    const descriptionParts = [
      body.description,
      body.pageUrl ? `Page: ${body.pageUrl}` : "",
      body.pageTitle ? `Page title: ${body.pageTitle}` : "",
      `Origin: ${authorization.origin}`,
      "Source: Crikket widget feature request (no Crikket report).",
    ].filter((line) => line.length > 0)

    const card = await createKanCard({
      title: body.title,
      description: descriptionParts.join("\n\n"),
      listPublicId,
    })

    if (!card) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Unable to create Kan card for feature request.",
      })
    }

    return buildJsonResponse(
      {
        cardPublicId: card.publicId,
        ok: true,
      },
      {
        headers: authorization.rateLimitHeaders,
      }
    )
  } catch (error) {
    if (error instanceof SyntaxError) {
      return toCaptureErrorResponse(
        new ORPCError("BAD_REQUEST", {
          message: "Invalid JSON in feature request.",
        }),
        {
          keyId,
          method: input.request.method,
          origin,
          route,
        }
      )
    }

    return toCaptureErrorResponse(error, {
      keyId,
      method: input.request.method,
      origin,
      route,
    })
  }
}
