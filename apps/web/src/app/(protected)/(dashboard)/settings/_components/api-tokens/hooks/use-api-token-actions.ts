"use client"

import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { client, queryClient } from "@/utils/orpc"

import type { CreatedApiToken } from "../types"

export function useApiTokenActions() {
  const createMutation = useMutation({
    mutationFn: async (input: {
      label: string
      scopes?: CreatedApiToken["scopes"]
    }) => client.apiToken.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      toast.success("API token created")
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create API token")
    },
  })

  const rotateMutation = useMutation({
    mutationFn: async (input: { tokenId: string }) =>
      client.apiToken.rotate(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      toast.success("API token rotated")
    },
    onError: (error) => {
      toast.error(error.message || "Failed to rotate API token")
    },
  })

  const revokeMutation = useMutation({
    mutationFn: async (input: { tokenId: string }) =>
      client.apiToken.revoke(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      toast.success("API token revoked")
    },
    onError: (error) => {
      toast.error(error.message || "Failed to revoke API token")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (input: { tokenId: string }) =>
      client.apiToken.delete(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      toast.success("API token deleted")
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete API token")
    },
  })

  return {
    createMutation,
    deleteMutation,
    revokeMutation,
    rotateMutation,
  }
}
