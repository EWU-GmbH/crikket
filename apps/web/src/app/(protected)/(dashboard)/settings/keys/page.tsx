import { authClient } from "@crikket/auth/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@crikket/ui/components/ui/card"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { getProtectedAuthData } from "@/app/(protected)/_lib/get-protected-auth-data"
import { client } from "@/utils/orpc"

import { PublicKeysManagement } from "../_components/public-keys/public-keys-management"
import { getRequestErrorMessage } from "../_lib/get-request-error-message"

export const metadata: Metadata = {
  title: "Public Keys Settings",
  description: "Manage site-scoped public keys and widget embed configuration.",
}

export default async function PublicKeysSettingsPage() {
  const { organizations, session } = await getProtectedAuthData()

  if (!session) {
    redirect("/login")
  }

  if (organizations.length === 0) {
    redirect("/onboarding")
  }

  const activeOrganization =
    organizations.find(
      (organization) => organization.id === session.session.activeOrganizationId
    ) ?? organizations[0]

  const requestHeaders = await headers()
  const authFetchOptions = {
    fetchOptions: {
      headers: requestHeaders,
    },
  }

  const { data: memberRoleData } =
    await authClient.organization.getActiveMemberRole({
      query: {
        organizationId: activeOrganization.id,
      },
      ...authFetchOptions,
    })

  const canManage =
    memberRoleData?.role === "owner" || memberRoleData?.role === "admin"
  const captureKeysState = canManage
    ? await client.captureKey
        .list()
        .then((data) => ({
          data,
          error: null,
        }))
        .catch((error) => ({
          data: [],
          error,
        }))
    : {
        data: [],
        error: null,
      }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-xl tracking-tight">Public Keys</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Manage site-scoped public keys, allowed origins, and embed access for{" "}
          {activeOrganization.name}.
        </p>
      </div>

      {canManage ? (
        <PublicKeysManagement
          canManage={canManage}
          initialKeys={captureKeysState.data}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Only organization admins and owners can manage public keys.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Ask an organization admin to create or rotate widget keys for your
            owned sites.
          </CardContent>
        </Card>
      )}

      {captureKeysState.error ? (
        <p className="text-destructive text-sm">
          Failed to load public keys:{" "}
          {getRequestErrorMessage(captureKeysState.error)}
        </p>
      ) : null}
    </div>
  )
}
