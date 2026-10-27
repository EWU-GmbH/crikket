"use client"

import type { BugReportStatus } from "@crikket/shared/constants/bug-report"
import { Badge } from "@crikket/ui/components/ui/badge"
import { Card, CardContent } from "@crikket/ui/components/ui/card"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"

import { orpc } from "@/utils/orpc"

const STATUS_LABELS: Record<BugReportStatus, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  needs_info: "Rückfrage",
  resolved: "Erledigt",
  closed: "Geschlossen",
}

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
})

export function MyReportedBugReports() {
  const { data } = useQuery(orpc.bugReport.listMine.queryOptions())
  const items = data?.items ?? []

  if (items.length === 0) {
    return null
  }

  return (
    <section className="flex flex-col gap-2">
      <div>
        <h2 className="font-semibold text-xl">Meine Meldungen</h2>
        <p className="text-muted-foreground text-sm">
          Von Ihnen eingereichte Meldungen in anderen Organisationen
        </p>
      </div>
      <Card>
        <CardContent className="divide-y p-0">
          {items.map((item) => (
            <Link
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-muted/50"
              href={`/s/${item.id}`}
              key={item.id}
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{item.title}</p>
                <p className="text-muted-foreground text-xs">
                  {item.organizationName} ·{" "}
                  {dateFormatter.format(new Date(item.createdAt))}
                </p>
              </div>
              <Badge className="shrink-0" variant="secondary">
                {STATUS_LABELS[item.status]}
              </Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
