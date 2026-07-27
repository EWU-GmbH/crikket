import { API_TOKEN_SCOPE_OPTIONS } from "@crikket/shared/constants/api-token"
import { buildPaginationMeta } from "@crikket/shared/lib/server/pagination"
import { ORPCError } from "@orpc/server"

import {
  countBugReportNetworkRequests,
  getBugReportDebuggerEventsData,
  getBugReportNetworkRequestPayload as getBugReportNetworkRequestPayloadData,
  getBugReportNetworkRequestsPage,
} from "../lib/debugger"
import {
  assertBugReportAccessById,
  bugReportIdInputSchema,
  debuggerNetworkRequestPayloadInputSchema,
  debuggerNetworkRequestsInputSchema,
  normalizeDebuggerNetworkRequestPagination,
} from "../lib/utils"
import { o } from "./context"
import { requireApiTokenScope } from "./helpers"

function assertDebuggerReadAccess(input: {
  apiToken: Parameters<typeof requireApiTokenScope>[0]
  id: string
  session: Parameters<typeof assertBugReportAccessById>[0]["session"]
}) {
  requireApiTokenScope(input.apiToken, API_TOKEN_SCOPE_OPTIONS.bugReportsRead)

  return assertBugReportAccessById({
    apiTokenOrganizationId: input.apiToken?.organizationId,
    id: input.id,
    session: input.session,
  })
}

export const getBugReportDebuggerEvents = o
  .input(bugReportIdInputSchema)
  .handler(async ({ context, input }) => {
    await assertDebuggerReadAccess({
      apiToken: context.apiToken,
      id: input.id,
      session: context.session,
    })

    return getBugReportDebuggerEventsData(input.id)
  })

export const getBugReportNetworkRequests = o
  .input(debuggerNetworkRequestsInputSchema)
  .handler(async ({ context, input }) => {
    await assertDebuggerReadAccess({
      apiToken: context.apiToken,
      id: input.id,
      session: context.session,
    })

    const { page, perPage, offset, limit } =
      normalizeDebuggerNetworkRequestPagination({
        page: input.page,
        perPage: input.perPage,
      })

    const [totalCount, items] = await Promise.all([
      countBugReportNetworkRequests({
        bugReportId: input.id,
        search: input.search,
      }),
      getBugReportNetworkRequestsPage({
        bugReportId: input.id,
        limit,
        offset,
        search: input.search,
      }),
    ])

    return {
      items,
      pagination: buildPaginationMeta(totalCount, page, perPage),
    }
  })

export const getBugReportNetworkRequestPayload = o
  .input(debuggerNetworkRequestPayloadInputSchema)
  .handler(async ({ context, input }) => {
    await assertDebuggerReadAccess({
      apiToken: context.apiToken,
      id: input.id,
      session: context.session,
    })

    const payload = await getBugReportNetworkRequestPayloadData({
      bugReportId: input.id,
      requestId: input.requestId,
    })

    if (!payload) {
      throw new ORPCError("NOT_FOUND", { message: "Network request not found" })
    }

    return payload
  })
