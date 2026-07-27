"use client"

import { useQuery } from "@tanstack/react-query"

import { orpc } from "@/utils/orpc"

import type { ApiTokensSnapshot } from "../types"

export function useApiTokensData(initialTokens: ApiTokensSnapshot) {
  return useQuery({
    ...orpc.apiToken.list.queryOptions(),
    initialData: initialTokens,
  })
}
