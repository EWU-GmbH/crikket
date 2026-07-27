"use client"

import { ConfirmationDialog } from "@crikket/ui/components/dialogs/confirmation-dialog"
import { Badge } from "@crikket/ui/components/ui/badge"
import { Button } from "@crikket/ui/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@crikket/ui/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@crikket/ui/components/ui/table"
import { MoreVertical, RefreshCcw, ShieldOff, Trash2 } from "lucide-react"
import { useState } from "react"

import type { ApiTokenItem } from "../types"

interface ApiTokensTableProps {
  canManage: boolean
  deletingTokenId: string | null
  items: ApiTokenItem[]
  onDelete: (input: { tokenId: string }) => Promise<void>
  onRevoke: (input: { tokenId: string }) => Promise<void>
  onRotate: (input: { tokenId: string }) => Promise<{ token: string }>
  revokingTokenId: string | null
  rotatingTokenId: string | null
}

export function ApiTokensTable({
  canManage,
  deletingTokenId,
  items,
  onDelete,
  onRevoke,
  onRotate,
  revokingTokenId,
  rotatingTokenId,
}: ApiTokensTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Label</TableHead>
          <TableHead>Prefix</TableHead>
          <TableHead>Scopes</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last used</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <ApiTokenRow
            canManage={canManage}
            isDeleting={deletingTokenId === item.id}
            isRevoking={revokingTokenId === item.id}
            isRotating={rotatingTokenId === item.id}
            item={item}
            key={item.id}
            onDelete={onDelete}
            onRevoke={onRevoke}
            onRotate={onRotate}
          />
        ))}
      </TableBody>
    </Table>
  )
}

function ApiTokenRow({
  canManage,
  isDeleting,
  isRevoking,
  isRotating,
  item,
  onDelete,
  onRevoke,
  onRotate,
}: {
  canManage: boolean
  isDeleting: boolean
  isRevoking: boolean
  isRotating: boolean
  item: ApiTokenItem
  onDelete: (input: { tokenId: string }) => Promise<void>
  onRevoke: (input: { tokenId: string }) => Promise<void>
  onRotate: (input: { tokenId: string }) => Promise<{ token: string }>
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false)

  return (
    <>
      <TableRow>
        <TableCell className="font-medium">{item.label}</TableCell>
        <TableCell className="font-mono text-xs">{item.prefix}…</TableCell>
        <TableCell>
          <div className="flex flex-wrap gap-1">
            {item.scopes.map((scope) => (
              <Badge key={scope} variant="secondary">
                {scope}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={item.status === "active" ? "default" : "outline"}>
            {item.status}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-xs">
          {item.lastUsedAt
            ? new Date(item.lastUsedAt).toLocaleString()
            : "Never"}
        </TableCell>
        <TableCell>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label="API token actions"
                  disabled={!canManage}
                  size="icon-sm"
                  variant="outline"
                />
              }
            >
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                disabled={isRotating}
                onClick={() => {
                  onRotate({ tokenId: item.id }).catch(() => undefined)
                }}
              >
                <RefreshCcw />
                {isRotating ? "Rotating..." : "Rotate token"}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={item.status === "revoked" || isRevoking}
                onClick={() => setIsRevokeDialogOpen(true)}
                variant="destructive"
              >
                <ShieldOff />
                {isRevoking ? "Revoking..." : "Revoke token"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={isDeleting}
                onClick={() => setIsDeleteDialogOpen(true)}
                variant="destructive"
              >
                <Trash2 />
                {isDeleting ? "Deleting..." : "Delete token"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <ConfirmationDialog
        confirmText="Revoke token"
        description="This token will stop working immediately. Rotate or create a new token to restore access."
        isLoading={isRevoking}
        onConfirm={async () => {
          await onRevoke({ tokenId: item.id })
        }}
        onOpenChange={setIsRevokeDialogOpen}
        open={isRevokeDialogOpen}
        title="Revoke API token?"
        variant="destructive"
      />

      <ConfirmationDialog
        confirmText="Delete token"
        description="This permanently deletes the token. Any MCP or automation using it will stop working."
        isLoading={isDeleting}
        onConfirm={async () => {
          await onDelete({ tokenId: item.id })
        }}
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
        title="Delete API token?"
        variant="destructive"
      />
    </>
  )
}
