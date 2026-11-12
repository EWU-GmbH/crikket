import { db } from "@crikket/db"
import { member, user } from "@crikket/db/schema/auth"
import { bugReport, bugReportComment } from "@crikket/db/schema/bug-report"
import { API_TOKEN_SCOPE_OPTIONS } from "@crikket/shared/constants/api-token"
import {
  BUG_REPORT_COMMENT_KIND_OPTIONS,
  BUG_REPORT_COMMENT_KIND_VALUES,
  BUG_REPORT_COMMENT_PURPOSE_OPTIONS,
  type BugReportCommentKind,
  type BugReportCommentPurpose,
} from "@crikket/shared/constants/bug-report"
import { ORPCError } from "@orpc/server"
import { and, asc, eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import {
  addCommentInputSchema,
  MISSING_REPORTER_EMAIL_INFO_MESSAGE,
  MISSING_REPORTER_EMAIL_QUESTION_MESSAGE,
  resolveCommentFollowUp,
} from "../lib/comment-follow-up"
import { sendReporterFollowUpEmail } from "../lib/notifications/send-reporter-follow-up-email"
import { getBugReportShareUrl } from "../lib/notifications/share-url"
import {
  canViewReporterFacingComments,
  projectReporterFacingComments,
} from "../lib/read-access-policy"
import {
  assertBugReportAccessById,
  bugReportIdInputSchema,
  canAccessPrivateReport,
  type SessionContext,
} from "../lib/utils"
import { o, protectedProcedure } from "./context"
import {
  requireApiTokenScope,
  requireBugReportsReadAccess,
  requireBugReportsWriteAccess,
} from "./helpers"

function missingReporterEmailMessage(purpose: BugReportCommentPurpose): string {
  switch (purpose) {
    case BUG_REPORT_COMMENT_PURPOSE_OPTIONS.info:
      return MISSING_REPORTER_EMAIL_INFO_MESSAGE
    case BUG_REPORT_COMMENT_PURPOSE_OPTIONS.question:
      return MISSING_REPORTER_EMAIL_QUESTION_MESSAGE
    default: {
      const exhaustive: never = purpose
      return exhaustive
    }
  }
}

function isCommentKind(value: string): value is BugReportCommentKind {
  return (BUG_REPORT_COMMENT_KIND_VALUES as readonly string[]).includes(value)
}

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

async function isOrganizationCommentViewer(input: {
  apiTokenOrganizationId?: string | null
  organizationId: string
  session?: SessionContext
}): Promise<boolean> {
  if (
    canAccessPrivateReport({
      apiTokenOrganizationId: input.apiTokenOrganizationId,
      organizationId: input.organizationId,
      session: input.session,
    })
  ) {
    return true
  }

  const userId = input.session?.user.id
  if (!userId) {
    return false
  }

  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, input.organizationId),
      eq(member.userId, userId)
    ),
    columns: { id: true },
  })

  return Boolean(membership)
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

/**
 * Read-only to_reporter comments for /s/<id>.
 * Audience: the signed-in reporter (reporter id, or verified email equal to
 * reporterEmail) or a member of the report's organization.
 * Anonymous visitors receive an empty list, including when the report is public.
 * Internal comments are never returned. Author emails and organization fields
 * are not part of the payload.
 */
export const listReporterFacingBugReportComments = o
  .input(bugReportIdInputSchema)
  .handler(async ({ context, input }) => {
    requireApiTokenScope(
      context.apiToken,
      API_TOKEN_SCOPE_OPTIONS.bugReportsRead
    )

    await assertBugReportAccessById({
      apiTokenOrganizationId: context.apiToken?.organizationId,
      id: input.id,
      session: context.session,
    })

    const report = await db.query.bugReport.findFirst({
      where: eq(bugReport.id, input.id),
      columns: {
        organizationId: true,
        reporterEmail: true,
        reporterId: true,
      },
    })

    if (!report) {
      throw new ORPCError("NOT_FOUND", { message: "Bug report not found" })
    }

    const isOrganizationViewer = await isOrganizationCommentViewer({
      apiTokenOrganizationId: context.apiToken?.organizationId,
      organizationId: report.organizationId,
      session: context.session,
    })
    const allowed = canViewReporterFacingComments({
      isOrganizationViewer,
      reporterEmail: report.reporterEmail,
      reporterId: report.reporterId,
      viewer: context.session?.user,
    })

    if (!allowed) {
      return { items: [] }
    }

    const comments = await db.query.bugReportComment.findMany({
      where: eq(bugReportComment.bugReportId, input.id),
      columns: {
        id: true,
        body: true,
        createdAt: true,
        kind: true,
      },
      orderBy: [asc(bugReportComment.createdAt)],
    })

    return {
      items: projectReporterFacingComments({
        allowed: true,
        comments: comments.map((comment) => ({
          id: comment.id,
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
          kind: comment.kind,
        })),
      }),
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

    const followUp = resolveCommentFollowUp({
      kind: input.kind,
      notifyReporter: input.notifyReporter,
      purpose: input.purpose,
      status: report.status,
    })

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

    if (followUp.notifyReporter) {
      const recipient = await resolveReporterEmail({
        reporterEmail: report.reporterEmail,
        reporterId: report.reporterId,
      })

      if (!recipient) {
        throw new ORPCError("BAD_REQUEST", {
          message: missingReporterEmailMessage(followUp.purpose),
        })
      }

      await sendReporterFollowUpEmail({
        to: recipient,
        title: report.title?.trim() || "Ihre Meldung",
        message: input.body,
        shareUrl: getBugReportShareUrl(report.id),
        purpose: followUp.purpose,
      })

      if (followUp.nextStatus) {
        await db
          .update(bugReport)
          .set({ status: followUp.nextStatus })
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

export {
  commentBodySchema,
  MAX_COMMENT_BODY_LENGTH,
} from "../lib/comment-follow-up"
