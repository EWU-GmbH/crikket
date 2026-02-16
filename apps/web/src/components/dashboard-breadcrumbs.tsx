"use client"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@crikket/ui/components/ui/breadcrumb"
import { usePathname } from "next/navigation"

function getBreadcrumbMeta(pathname: string): {
  parent: string
  parentHref: string
  current: string
} {
  if (pathname.startsWith("/settings/user")) {
    return {
      parent: "Settings",
      parentHref: "/settings/user",
      current: "User",
    }
  }

  if (pathname.startsWith("/settings/organization")) {
    return {
      parent: "Settings",
      parentHref: "/settings/organization",
      current: "Organization",
    }
  }

  if (pathname.startsWith("/settings")) {
    return {
      parent: "Settings",
      parentHref: "/settings/user",
      current: "Overview",
    }
  }

  return {
    parent: "Bug Reports",
    parentHref: "/",
    current: "All Bug Reports",
  }
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname()
  const breadcrumbMeta = getBreadcrumbMeta(pathname)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink href={breadcrumbMeta.parentHref}>
            {breadcrumbMeta.parent}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator className="hidden md:block" />
        <BreadcrumbItem>
          <BreadcrumbPage>{breadcrumbMeta.current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
