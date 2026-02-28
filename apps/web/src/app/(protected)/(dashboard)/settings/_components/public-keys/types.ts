import type { AppRouterClient } from "@crikket/api/routers/index"

export type PublicKeysSnapshot = Awaited<
  ReturnType<AppRouterClient["captureKey"]["list"]>
>

export type PublicKeyItem = PublicKeysSnapshot[number]
