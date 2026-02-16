import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@crikket/ui/components/ui/card"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getProtectedAuthData } from "@/app/(protected)/_lib/get-protected-auth-data"

import { UserSettingsNameForm } from "../_components/user-settings-name-form"
import { UserSettingsPasswordForm } from "../_components/user-settings-password-form"

export const metadata: Metadata = {
  title: "User Settings",
  description: "Manage your name and password.",
}

export default async function UserSettingsPage() {
  const { session } = await getProtectedAuthData()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-xl tracking-tight">User Settings</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Update your personal profile and account security settings.
        </p>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Name</CardTitle>
            <CardDescription>
              Change how your name appears across the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserSettingsNameForm initialName={session.user.name} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Keep your account secure with a strong password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserSettingsPasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
