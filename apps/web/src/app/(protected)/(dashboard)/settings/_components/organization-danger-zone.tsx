"use client"

import { authClient } from "@crikket/auth/client"
import { InputConfirmationDialog } from "@crikket/ui/components/dialogs/input-confirmation-dialog"
import { Button } from "@crikket/ui/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@crikket/ui/components/ui/card"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "nextjs-toploader/app"
import * as React from "react"
import { toast } from "sonner"

import type { OrganizationRole } from "./org-members/types"

interface OrganizationDangerZoneProps {
  organizationId: string
  organizationName: string
  currentUserRole: OrganizationRole
}

function canDeleteOrganization(role: OrganizationRole): boolean {
  return role === "owner"
}

export function OrganizationDangerZone({
  organizationId,
  organizationName,
  currentUserRole,
}: OrganizationDangerZoneProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const canDelete = canDeleteOrganization(currentUserRole)

  const deleteOrganizationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await authClient.organization.delete({
        organizationId,
      })

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      toast.success("Organization deleted")
      router.push("/onboarding")
      router.refresh()
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to delete organization")
    },
  })

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          Permanently delete this organization and remove all associated access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <p className="font-medium text-sm">Delete organization</p>
          <p className="text-muted-foreground text-sm">
            This action cannot be undone.
          </p>
        </div>
        <Button
          disabled={!canDelete}
          onClick={() => setDialogOpen(true)}
          variant="destructive"
        >
          Delete organization
        </Button>
        {canDelete ? (
          <p className="text-muted-foreground text-xs">
            To confirm, type{" "}
            <span className="font-medium">{organizationName}</span>.
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">
            Only organization owners can delete this organization.
          </p>
        )}
      </CardContent>

      <InputConfirmationDialog
        cancelText="Cancel"
        confirmationHelpText={`Type "${organizationName}" to permanently delete this organization.`}
        confirmationLabel="Confirm organization name"
        confirmationValue={organizationName}
        confirmText="Delete organization"
        description="Deleting this organization is permanent and cannot be undone."
        isLoading={deleteOrganizationMutation.isPending}
        onConfirm={async () => {
          await deleteOrganizationMutation.mutateAsync()
        }}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
        title="Delete organization?"
        variant="destructive"
      />
    </Card>
  )
}
