"use client"

import { Button } from "@crikket/ui/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@crikket/ui/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@crikket/ui/components/ui/dialog"
import { Plus } from "lucide-react"
import * as React from "react"

import { CopyValueButton } from "../public-keys/components/copy-value-button"
import { ApiTokenCreateForm } from "./forms/api-token-create-form"
import { useApiTokenActions } from "./hooks/use-api-token-actions"
import { useApiTokensData } from "./hooks/use-api-tokens-data"
import { ApiTokensTable } from "./table/api-tokens-table"
import type { ApiTokensSnapshot } from "./types"

interface ApiTokensManagementProps {
  canManage: boolean
  initialTokens: ApiTokensSnapshot
}

export function ApiTokensManagement({
  canManage,
  initialTokens,
}: ApiTokensManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [revealedToken, setRevealedToken] = React.useState<string | null>(null)
  const tokensQuery = useApiTokensData(initialTokens)
  const { createMutation, deleteMutation, revokeMutation, rotateMutation } =
    useApiTokenActions()

  const tokens = tokensQuery.data ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>API Tokens</CardTitle>
            <CardDescription>
              Create org-scoped tokens for Cursor MCP and other integrations.
              The full secret is shown only once after create or rotate.
            </CardDescription>
          </div>
          <Button
            disabled={!canManage}
            onClick={() => setIsCreateDialogOpen(true)}
            type="button"
          >
            <Plus />
            Create token
          </Button>
        </CardHeader>
        <CardContent>
          {tokens.length > 0 ? (
            <ApiTokensTable
              canManage={canManage}
              deletingTokenId={
                deleteMutation.isPending
                  ? (deleteMutation.variables?.tokenId ?? null)
                  : null
              }
              items={tokens}
              onDelete={async (input) => {
                await deleteMutation.mutateAsync(input)
              }}
              onRevoke={async (input) => {
                await revokeMutation.mutateAsync(input)
              }}
              onRotate={async (input) => {
                const result = await rotateMutation.mutateAsync(input)
                setRevealedToken(result.token)
                return result
              }}
              revokingTokenId={
                revokeMutation.isPending
                  ? (revokeMutation.variables?.tokenId ?? null)
                  : null
              }
              rotatingTokenId={
                rotateMutation.isPending
                  ? (rotateMutation.variables?.tokenId ?? null)
                  : null
              }
            />
          ) : (
            <div className="text-muted-foreground text-sm">
              No API tokens yet. Create one to connect Cursor MCP or other
              automation tools.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog onOpenChange={setIsCreateDialogOpen} open={isCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API token</DialogTitle>
            <DialogDescription>
              Tokens authenticate machine access to private bug reports for this
              organization.
            </DialogDescription>
          </DialogHeader>
          <ApiTokenCreateForm
            isPending={!canManage || createMutation.isPending}
            onSubmit={async (input) => {
              const result = await createMutation.mutateAsync(input)
              setIsCreateDialogOpen(false)
              setRevealedToken(result.token)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setRevealedToken(null)
          }
        }}
        open={revealedToken !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your API token</DialogTitle>
            <DialogDescription>
              This secret will not be shown again. Store it in your Cursor MCP
              config as `CRIKKET_API_TOKEN`.
            </DialogDescription>
          </DialogHeader>
          {revealedToken ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
              <code className="min-w-0 flex-1 break-all font-mono text-xs">
                {revealedToken}
              </code>
              <CopyValueButton
                ariaLabel="Copy API token"
                value={revealedToken}
                variant="outline"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
