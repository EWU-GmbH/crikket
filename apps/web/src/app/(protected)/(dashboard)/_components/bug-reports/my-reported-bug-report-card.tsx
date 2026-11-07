"use client"

import type { BugReportStatus } from "@crikket/shared/constants/bug-report"
import type { Priority } from "@crikket/shared/constants/priorities"
import { Card, CardContent } from "@crikket/ui/components/ui/card"
import { Building2, Clock } from "lucide-react"
import Link from "next/link"
import type { ReactNode } from "react"

import { MediaPreview, MediaTypeBadge } from "./bug-report-media"
import { formatPriorityLabel, formatStatusLabel } from "./filters"

export interface MyReportedBugReportCardItem {
  id: string
  title: string
  description?: string | undefined
  status: BugReportStatus
  priority: Priority
  organizationName: string
  duration?: string | undefined
  thumbnail?: string | undefined
  attachmentUrl?: string | undefined
  attachmentType?: "video" | "screenshot" | undefined
  createdAt: string
}

interface MyReportedBugReportCardProps {
  report: MyReportedBugReportCardItem
}

/**
 * Read-only tile for cross-org reports the viewer submitted.
 * No edit/delete/visibility controls — those stay org-scoped.
 */
export function MyReportedBugReportCard({
  report,
}: MyReportedBugReportCardProps) {
  return (
    <Card className="group relative overflow-hidden p-0 transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link
        aria-label={`${report.title} aus ${report.organizationName}, Status ${formatStatusLabel(report.status)}`}
        className="absolute inset-0 z-10"
        href={`/s/${report.id}`}
      />
      <CardContent className="p-0">
        <div className="relative aspect-video overflow-hidden bg-muted">
          <MediaPreview emptyLabel={report.organizationName} report={report} />

          <div className="pointer-events-none absolute top-2 left-2 z-20">
            <span className="inline-flex max-w-[85%] items-center gap-1 rounded-md border border-white/15 bg-black/75 px-2 py-1 font-medium text-[11px] text-white backdrop-blur-sm">
              <Building2 aria-hidden="true" className="size-3 shrink-0" />
              <span className="truncate">{report.organizationName}</span>
            </span>
          </div>

          <div className="pointer-events-none absolute bottom-2 left-2 z-20">
            {report.attachmentType ? (
              <MediaTypeBadge attachmentType={report.attachmentType} />
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-black/75 px-2 py-1 font-medium text-[11px] text-white backdrop-blur-sm">
                Ohne Anhang
              </span>
            )}
          </div>

          {report.attachmentType === "video" && report.duration ? (
            <div className="pointer-events-none absolute right-2 bottom-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-white text-xs">
              <Clock aria-hidden="true" className="h-3 w-3" />
              {report.duration}
            </div>
          ) : null}
        </div>

        <div className="space-y-2 p-3">
          <div className="min-w-0 space-y-1">
            <h3
              className="line-clamp-1 font-semibold text-sm leading-tight"
              title={report.title}
            >
              {report.title}
            </h3>
            <p className="text-muted-foreground text-xs">
              {new Date(report.createdAt).toLocaleString("de-DE")}
            </p>
          </div>

          <p className="line-clamp-2 min-h-8 text-muted-foreground text-xs">
            {report.description || "Keine zusätzliche Beschreibung"}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            <Chip>{formatStatusLabel(report.status)}</Chip>
            <Chip>{formatPriorityLabel(report.priority)}</Chip>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-[11px]">
      {children}
    </span>
  )
}
