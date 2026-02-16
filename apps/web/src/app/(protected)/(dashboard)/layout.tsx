import { ModeToggle } from "@crikket/ui/components/mode-toggle"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@crikket/ui/components/ui/sidebar"
import { redirect } from "next/navigation"

import { getProtectedAuthData } from "@/app/(protected)/_lib/get-protected-auth-data"
import { AppSidebar } from "@/components/app-sidebar"
import { UnverifiedEmailBanner } from "@/components/auth/unverified-email-banner"
import { DashboardBreadcrumbs } from "@/components/dashboard-breadcrumbs"
import { Shell } from "@/components/shell"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  return (
    <SidebarProvider className="min-h-svh items-stretch">
      <AppSidebar
        activeOrganization={activeOrganization}
        organizations={organizations}
        user={session.user}
      />
      <SidebarInset>
        <header className="sticky top-0 z-50 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <DashboardBreadcrumbs />
          </div>
          <ModeToggle />
        </header>
        <Shell>
          {session.user.emailVerified ? null : <UnverifiedEmailBanner />}
          {children}
        </Shell>
      </SidebarInset>
    </SidebarProvider>
  )
}
