"use client"

import { Badge } from "@crikket/ui/components/ui/badge"
import { Button } from "@crikket/ui/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@crikket/ui/components/ui/select"
import type { ColumnDef } from "@tanstack/react-table"

import { formatRoleLabel } from "./role-labels"
import type { OrganizationMemberRow } from "./types"

interface MembersTableColumnsOptions {
  canManageMembers: boolean
  currentUserId: string
  updatingMemberId: string | null
  removingMemberId: string | null
  onRequestRemove: (memberId: string) => void
  onUpdateMemberRole: (
    memberId: string,
    role: "admin" | "member"
  ) => Promise<void>
}

const MANAGEABLE_ROLES = new Set(["admin", "member"])

function formatJoinedDate(value: string): string {
  return new Date(value).toLocaleDateString()
}

function getRoleVariant(role: string): "default" | "secondary" | "outline" {
  if (role === "owner") {
    return "default"
  }

  if (role === "admin") {
    return "secondary"
  }

  return "outline"
}

export function createMembersTableColumns({
  canManageMembers,
  currentUserId,
  updatingMemberId,
  removingMemberId,
  onRequestRemove,
  onUpdateMemberRole,
}: MembersTableColumnsOptions): ColumnDef<OrganizationMemberRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const isCurrentUser = row.original.userId === currentUserId

        return (
          <div className="space-y-1">
            <p className="font-medium">{row.original.name}</p>
            {isCurrentUser ? (
              <p className="text-muted-foreground text-xs">You</p>
            ) : null}
          </div>
        )
      },
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const member = row.original
        const isCurrentUser = member.userId === currentUserId
        const isOwner = member.role === "owner"
        const canEditRole =
          canManageMembers &&
          !isCurrentUser &&
          !isOwner &&
          MANAGEABLE_ROLES.has(member.role)

        if (!canEditRole) {
          return (
            <Badge variant={getRoleVariant(member.role)}>
              {formatRoleLabel(member.role)}
            </Badge>
          )
        }

        const isUpdating = updatingMemberId === member.memberId

        return (
          <Select
            disabled={isUpdating}
            onValueChange={(nextRole) => {
              const role = nextRole as "admin" | "member"

              if (role === member.role) {
                return
              }

              onUpdateMemberRole(member.memberId, role).catch(() => undefined)
            }}
            value={member.role}
          >
            <SelectTrigger className="h-8 w-[140px]">
              <SelectValue>{formatRoleLabel(member.role)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
    {
      accessorKey: "joinedAt",
      header: "Joined",
      cell: ({ row }) => formatJoinedDate(row.original.joinedAt),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const member = row.original
        const isCurrentUser = member.userId === currentUserId
        const isOwner = member.role === "owner"
        const canRemove = canManageMembers && !isCurrentUser && !isOwner
        const isRemoving = removingMemberId === member.memberId

        return canRemove ? (
          <Button
            disabled={isRemoving}
            onClick={() => onRequestRemove(member.memberId)}
            size="sm"
            variant="destructive"
          >
            {isRemoving ? "Removing..." : "Remove"}
          </Button>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        )
      },
    },
  ]
}
