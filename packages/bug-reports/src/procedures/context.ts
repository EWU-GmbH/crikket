import { createSessionProcedures } from "@crikket/shared/lib/server/orpc-auth"
import { ORPCError, os } from "@orpc/server"

import type { ResolvedApiTokenContext } from "../lib/organization-api-token"
import type { SessionContext } from "../lib/utils"

export type BugReportsRequestContext = {
  apiToken?: ResolvedApiTokenContext
  session?: SessionContext
}

const o = os.$context<BugReportsRequestContext>()

const requireSessionOrApiToken = o.middleware(({ context, next }) => {
  if (!(context.session?.user || context.apiToken)) {
    throw new ORPCError("UNAUTHORIZED")
  }

  return next({
    context: {
      apiToken: context.apiToken,
      session: context.session,
    },
  })
})

const { o: sessionO, protectedProcedure: sessionProcedure } =
  createSessionProcedures<SessionContext>({
    isAuthorized: (session) => Boolean(session?.user),
  })

export const protectedProcedure = o.use(requireSessionOrApiToken)

export { o, sessionO, sessionProcedure }
