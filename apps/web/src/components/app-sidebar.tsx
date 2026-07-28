"use client"

import type { authClient } from "@crikket/auth/client"
import { siteConfig } from "@crikket/shared/config/site"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@crikket/ui/components/ui/sidebar"
import {
  BookOpen,
  Building2,
  CreditCard,
  Github,
  KeyRound,
  type LucideIcon,
  UserRound,
  Video,
} from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type * as React from "react"
import { TeamSwitcher } from "@/components/team-switcher"
import { UserNav } from "@/components/user-nav"
import { getDocsUrl } from "@/lib/site"

type Organization = typeof authClient.$Infer.Organization

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: typeof authClient.$Infer.Session.user
  organizations: Organization[]
  activeOrganization?: Organization
}

const navPrimary = [
  {
    title: "Bug Reports",
    url: "/" as const,
    matchPrefix: "/" as const,
    icon: Video,
  },
]

const navSettings = [
  {
    title: "User",
    url: "/settings/user" as const,
    icon: UserRound,
  },
  {
    title: "Organization",
    url: "/settings/organization" as const,
    icon: Building2,
  },
  {
    title: "Public Keys",
    url: "/settings/keys" as const,
    icon: KeyRound,
  },
  {
    title: "Billing",
    url: "/settings/billing" as const,
    icon: CreditCard,
  },
] as const

const navSecondary: {
  title: string
  href?: string
  icon: LucideIcon
}[] = [
  {
    title: "Documentation",
    icon: BookOpen,
  },
  {
    title: "Source Code (AGPL-3.0)",
    href: siteConfig.links.source,
    icon: Github,
  },
]

export function AppSidebar({
  user,
  organizations,
  activeOrganization,
  ...props
}: AppSidebarProps) {
  const pathname = usePathname()
  const docsUrl = getDocsUrl()

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <TeamSwitcher
          activeOrganization={activeOrganization}
          organizations={organizations}
          userId={user.id}
        />
      </SidebarHeader>
      <SidebarContent className="gap-0">
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navPrimary.map((item) => {
                const isActive =
                  item.matchPrefix === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.matchPrefix)

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      render={(props) => (
                        <Link href={item.url as Route} {...props} />
                      )}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navSettings.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.url)}
                    render={(props) => (
                      <Link href={item.url as Route} {...props} />
                    )}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {navSecondary.map((item) => {
                const href = item.href ?? docsUrl

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={(props) =>
                        href ? (
                          <a
                            href={href}
                            rel="noopener noreferrer"
                            target="_blank"
                            {...props}
                          />
                        ) : (
                          <button type="button" {...props} />
                        )
                      }
                      size="sm"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserNav user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
