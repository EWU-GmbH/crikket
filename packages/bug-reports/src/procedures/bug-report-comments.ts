import { db } from "@crikket/db"
import { user } from "@crikket/db/schema/auth"
import { bugReport, bugReportComment } from "@crikket/db/schema/bug-report"
import {
  BUG_REPORT_COMMENT_KIND_OPTIONS,
  BUG_REPORT_COMMENT_KIND_VALUES,
  BUG_REPORT_STATUS_OPTIONS,
  type BugReportCommentKind,
} from "@crikket/shared/constants/bug-report"
import { ORPCError } from "@orpc/server"
import { and, asc, eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { z } from "zod"
import { sendReporterFollowUpEmail } from "../lib/notifications/send-reporter-follow-up-email"
import { getBugReportShareUrl } from "../lib/notifications/share-url"
import { bugReportIdInputSchema } from "../lib/utils"
import { protectedProcedure } from "./context"
import {
  requireBugReportsReadAccess,
  requireBugReportsWriteAccess,
} from "./helpers"

const MAX_COMMENT_BODY_LENGTH = 4000

const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Nachricht darf nicht leer sein")
  .max(MAX_COMMENT_BODY_LENGTH)

const addCommentInputSchema = z
  .object({
    bugReportId: z.string().min(1),
    body: commentBodySchema,
    kind: z.enum(BUG_REPORT_COMMENT_KIND_VALUES),
    notifyReporter: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.kind === BUG_REPORT_COMMENT_KIND_OPTIONS.internal &&
      value.notifyReporter
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Interne Notizen werden nicht an den Ersteller gesendet",
      })
    }
  })

async function resolveReporterEmail(input: {
  reporterEmail: string | null
  reporterId: string | null
}): Promise<string | null> {
  if (input.reporterEmail?.trim()) {
    return input.reporterEmail.trim()
  }

  if (!input.reporterId) {
    return null
  }

  const reporter = await db.query.user.findFirst({
    where: eq(user.id, input.reporterId),
    columns: { email: true },
  })

  return reporter?.email?.trim() ?? null
}

function isCommentKind(value: string): value is BugReportCommentKind {
  return (BUG_REPORT_COMMENT_KIND_VALUES as readonly string[]).includes(value)
}

export const listBugReportComments = protectedProcedure
  .input(bugReportIdInputSchema)
  .handler(async ({ context, input }) => {
    const activeOrgId = requireBugReportsReadAccess(context)

    const report = await db.query.bugReport.findFirst({
      where: and(
        eq(bugReport.id, input.id),
        eq(bugReport.organizationId, activeOrgId)
      ),
      columns: { id: true },
    })

    if (!report) {
      throw new ORPCError("NOT_FOUND", { message: "Bug report not found" })
    }

    const comments = await db.query.bugReportComment.findMany({
      where: eq(bugReportComment.bugReportId, input.id),
      with: {
        author: {
          columns: { id: true, name: true },
        },
      },
      orderBy: [asc(bugReportComment.createdAt)],
    })

    return {
      items: comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        kind: isCommentKind(comment.kind)
          ? comment.kind
          : BUG_REPORT_COMMENT_KIND_OPTIONS.internal,
        createdAt: comment.createdAt.toISOString(),
        author: comment.author
          ? { id: comment.author.id, name: comment.author.name }
          : null,
      })),
    }
  })

export const addBugReportComment = protectedProcedure
  .input(addCommentInputSchema)
  .handler(async ({ context, input }) => {
    const activeOrgId = requireBugReportsWriteAccess(context)
    const authorUserId = context.session?.user.id ?? null

    const report = await db.query.bugReport.findFirst({
      where: and(
        eq(bugReport.id, input.bugReportId),
        eq(bugReport.organizationId, activeOrgId)
      ),
      columns: {
        id: true,
        title: true,
        status: true,
        reporterEmail: true,
        reporterId: true,
      },
    })

    if (!report) {
      throw new ORPCError("NOT_FOUND", { message: "Bug report not found" })
    }

    const shouldNotifyReporter =
      input.notifyReporter === true &&
      input.kind === BUG_REPORT_COMMENT_KIND_OPTIONS.toReporter

    const [inserted] = await db
      .insert(bugReportComment)
      .values({
        id: nanoid(16),
        bugReportId: report.id,
        authorUserId,
        body: input.body,
        kind: input.kind,
      })
      .returning({
        id: bugReportComment.id,
        body: bugReportComment.body,
        kind: bugReportComment.kind,
        createdAt: bugReportComment.createdAt,
      })

    if (!inserted) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to save comment",
      })
    }

    if (shouldNotifyReporter) {
      const recipient = await resolveReporterEmail({
        reporterEmail: report.reporterEmail,
        reporterId: report.reporterId,
      })

      if (!recipient) {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Keine E-Mail-Adresse des Erstellers hinterlegt — Rückfrage kann nicht gesendet werden",
        })
      }

      await sendReporterFollowUpEmail({
        to: recipient,
        title: report.title?.trim() || "Ihre Meldung",
        message: input.body,
        shareUrl: getBugReportShareUrl(report.id),
      })

      const shouldSetNeedsInfo =
        report.status === BUG_REPORT_STATUS_OPTIONS.open ||
        report.status === BUG_REPORT_STATUS_OPTIONS.inProgress

      if (shouldSetNeedsInfo) {
        await db
          .update(bugReport)
          .set({ status: BUG_REPORT_STATUS_OPTIONS.needsInfo })
          .where(eq(bugReport.id, report.id))
      }
    }

    return {
      id: inserted.id,
      body: inserted.body,
      kind: isCommentKind(inserted.kind)
        ? inserted.kind
        : BUG_REPORT_COMMENT_KIND_OPTIONS.internal,
      createdAt: inserted.createdAt.toISOString(),
    }
  })

export async function insertBugReportComment(input: {
  bugReportId: string
  authorUserId: string | null
  body: string
  kind: BugReportCommentKind
}): Promise<void> {
  await db.insert(bugReportComment).values({
    id: nanoid(16),
    bugReportId: input.bugReportId,
    authorUserId: input.authorUserId,
    body: input.body,
    kind: input.kind,
  })
}

export { commentBodySchema, MAX_COMMENT_BODY_LENGTH }
