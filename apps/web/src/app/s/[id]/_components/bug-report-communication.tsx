"use client"

import {
  BUG_REPORT_COMMENT_KIND_OPTIONS,
  type BugReportCommentKind,
} from "@crikket/shared/constants/bug-report"
import { Button } from "@crikket/ui/components/ui/button"
import { Textarea } from "@crikket/ui/components/ui/textarea"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, Mail, MessageSquareText, StickyNote } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { client, orpc } from "@/utils/orpc"

interface BugReportCommunicationProps {
  bugReportId: string
  canEdit: boolean
  onReportUpdated?: () => Promise<void> | void
}

function formatCommentKind(kind: BugReportCommentKind): string {
  switch (kind) {
    case BUG_REPORT_COMMENT_KIND_OPTIONS.toReporter:
      return "An Ersteller"
    default:
      return "Intern"
  }
}

function formatCommentTimestamp(value: string): string {
  return new Date(value).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

export function BugReportCommunication({
  bugReportId,
  canEdit,
  onReportUpdated,
}: BugReportCommunicationProps) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState("")

  const commentsQuery = useQuery(
    orpc.bugReport.listComments.queryOptions({
      input: { id: bugReportId },
      enabled: Boolean(bugReportId) && canEdit,
    })
  )

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: orpc.bugReport.listComments.queryOptions({
        input: { id: bugReportId },
      }).queryKey,
    })
    await onReportUpdated?.()
  }

  const addCommentMutation = useMutation({
    mutationFn: async (input: {
      kind: BugReportCommentKind
      notifyReporter: boolean
    }) => {
      const body = message.trim()
      if (body.length === 0) {
        throw new Error("Bitte geben Sie eine Nachricht ein.")
      }

      await client.bugReport.addComment({
        bugReportId,
        body,
        kind: input.kind,
        notifyReporter: input.notifyReporter,
      })
    },
    onSuccess: async () => {
      setMessage("")
      await invalidate()
      toast.success("Nachricht gespeichert")
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Speichern fehlgeschlagen"
      )
    },
  })

  if (!canEdit) {
    return null
  }

  const comments = commentsQuery.data?.items ?? []
  const isSubmitting = addCommentMutation.isPending

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-muted-foreground text-xs uppercase tracking-wider">
          Kommunikation
        </h3>
      </div>

      {commentsQuery.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Nachrichten werden geladen…
        </div>
      ) : comments.length > 0 ? (
        <ul className="space-y-3">
          {comments.map((comment) => (
            <li
              className="rounded-md border bg-muted/20 p-3 text-sm"
              key={comment.id}
            >
              <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground text-xs">
                <span className="font-medium text-foreground">
                  {comment.author?.name ?? "Team"}
                </span>
                <span>·</span>
                <span>{formatCommentTimestamp(comment.createdAt)}</span>
                <span>·</span>
                <span>{formatCommentKind(comment.kind)}</span>
              </div>
              <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">
          Noch keine Nachrichten. Senden Sie eine Rückfrage an den Ersteller oder
          notieren Sie intern.
        </p>
      )}

      <div className="space-y-3">
        <Textarea
          disabled={isSubmitting}
          maxLength={4000}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Nachricht an den Ersteller oder interne Notiz…"
          rows={4}
          value={message}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isSubmitting || message.trim().length === 0}
            onClick={() =>
              addCommentMutation.mutate({
                kind: BUG_REPORT_COMMENT_KIND_OPTIONS.toReporter,
                notifyReporter: true,
              })
            }
            size="sm"
            type="button"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Rückfrage senden
          </Button>
          <Button
            disabled={isSubmitting || message.trim().length === 0}
            onClick={() =>
              addCommentMutation.mutate({
                kind: BUG_REPORT_COMMENT_KIND_OPTIONS.internal,
                notifyReporter: false,
              })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <StickyNote className="h-4 w-4" />
            )}
            Nur intern notieren
          </Button>
        </div>
      </div>
    </div>
  )
}
