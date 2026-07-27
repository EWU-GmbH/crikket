import type { AppRouterClient } from "@crikket/api/routers/index"

export type ApiTokensSnapshot = Awaited<
  ReturnType<AppRouterClient["apiToken"]["list"]>
>

export type ApiTokenItem = ApiTokensSnapshot[number]

export type CreatedApiToken = Awaited<
  ReturnType<AppRouterClient["apiToken"]["create"]>
>
