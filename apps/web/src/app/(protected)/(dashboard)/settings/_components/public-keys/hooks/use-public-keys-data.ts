"use client"

import { useQuery } from "@tanstack/react-query"

import { orpc } from "@/utils/orpc"
import type { PublicKeysSnapshot } from "../types"

export function usePublicKeysData(initialKeys: PublicKeysSnapshot) {
  return useQuery({
    ...orpc.captureKey.list.queryOptions(),
    initialData: initialKeys,
  })
}
