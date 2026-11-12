"use client"

import { Separator } from "@crikket/ui/components/ui/separator"
import { useQuery } from "@tanstack/react-query"
import { MessageSquareText } from "lucide-react"

import { orpc } from "@/utils/orpc"

interface ReporterFacingCommentsProps {
  bugReportId: string
}

function formatCommentTimestamp(value: string): string {
  return new Date(value).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function ReporterFacingComments({
  bugReportId,
}: ReporterFacingCommentsProps) {
  const commentsQuery = useQuery(
    orpc.bugReport.listReporterComments.queryOptions({
      input: { id: bugReportId },
    })
  )
  const comments = commentsQuery.data?.items ?? []

  if (comments.length === 0) {
    return null
  }

  return (
    <>
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
            Nachrichten zu Ihrer Meldung
          </h3>
        </div>
        <p className="text-muted-foreground text-xs">Nur zum Lesen.</p>
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li
              className="rounded-md border bg-muted/20 p-3 text-sm"
              key={comment.id}
            >
              <p className="mb-2 text-muted-foreground text-xs">
                {formatCommentTimestamp(comment.createdAt)}
              </p>
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
