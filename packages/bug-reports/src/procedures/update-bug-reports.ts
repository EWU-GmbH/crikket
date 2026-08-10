import { db } from "@crikket/db"
import { bugReport } from "@crikket/db/schema/bug-report"
import {
  BUG_REPORT_COMMENT_KIND_OPTIONS,
} from "@crikket/shared/constants/bug-report"
import {
  PRIORITY_OPTIONS,
  type Priority,
} from "@crikket/shared/constants/priorities"
import { ORPCError } from "@orpc/server"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import {
  handleBugReportStatusTransition,
  isResolvedStatus,
} from "../lib/status-side-effects"
import {
  commentBodySchema,
  insertBugReportComment,
} from "./bug-report-comments"
import {
  isStatus,
  isVisibility,
  optionalText,
  statusValues,
  visibilityValues,
} from "../lib/utils"
import { protectedProcedure } from "./context"
import { normalizeTags, requireBugReportsWriteAccess } from "./helpers"

const priorityValues = Object.values(PRIORITY_OPTIONS) as [
  Priority,
  ...Priority[],
]

const tagsInputSchema = z.array(z.string().trim().min(1).max(40)).max(20)

const reporterEmailInputSchema = z
  .string()
  .trim()
  .max(320)
  .optional()
  .superRefine((value, ctx) => {
    if (value !== undefined && value.length > 0 && !z.email().safeParse(value).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ungültige E-Mail-Adresse",
      })
    }
  })
  .transform((value) => {
    if (value === undefined) {
      return undefined
    }

    return value.length > 0 ? value : null
  })

const bugReportUpdateInputSchema = z
  .object({
    id: z.string().min(1),
    title: optionalText(200),
    status: z.enum(statusValues).optional(),
    priority: z.enum(priorityValues).optional(),
    visibility: z.enum(visibilityValues).optional(),
    tags: tagsInputSchema.optional(),
    reporterEmail: reporterEmailInputSchema,
    resolutionMessage: commentBodySchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.title === undefined &&
      value.status === undefined &&
      value.priority === undefined &&
      value.visibility === undefined &&
      value.tags === undefined &&
      value.reporterEmail === undefined &&
      value.resolutionMessage === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one update field is required",
      })
    }

    if (value.resolutionMessage !== undefined) {
      const targetStatus = value.status
      if (
        targetStatus !== undefined &&
        !isResolvedStatus(targetStatus)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Abschlussnachricht ist nur bei Status Resolved oder Closed möglich",
          path: ["resolutionMessage"],
        })
      }
    }
  })

const bugReportBulkUpdateInputSchema = z
  .object({
    ids: z.array(z.string().min(1)).min(1).max(200),
    status: z.enum(statusValues).optional(),
    priority: z.enum(priorityValues).optional(),
    visibility: z.enum(visibilityValues).optional(),
    tags: tagsInputSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.status === undefined &&
      value.priority === undefined &&
      value.visibility === undefined &&
      value.tags === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one update field is required",
      })
    }
  })

function buildUpdateValues(input: {
  title?: string
  status?: (typeof statusValues)[number]
  priority?: Priority
  visibility?: (typeof visibilityValues)[number]
  tags?: string[]
  reporterEmail?: string | null
}) {
  const values: {
    title?: string
    status?: string
    priority?: string
    visibility?: string
    tags?: string[]
    reporterEmail?: string | null
  } = {}

  if (input.title !== undefined) {
    values.title = input.title
  }

  if (input.status !== undefined) {
    values.status = input.status
  }

  if (input.priority !== undefined) {
    values.priority = input.priority
  }

  if (input.visibility !== undefined) {
    values.visibility = input.visibility
  }

  if (input.tags !== undefined) {
    values.tags = normalizeTags(input.tags) ?? []
  }

  if (input.reporterEmail !== undefined) {
    values.reporterEmail = input.reporterEmail
  }

  return values
}

export const updateBugReport = protectedProcedure
  .input(bugReportUpdateInputSchema)
  .handler(async ({ context, input }) => {
    const activeOrgId = requireBugReportsWriteAccess(context)
    const values = buildUpdateValues(input)
    const authorUserId = context.session?.user.id ?? null

    const existingReport =
      input.status !== undefined || input.resolutionMessage !== undefined
        ? await db.query.bugReport.findFirst({
            where: and(
              eq(bugReport.id, input.id),
              eq(bugReport.organizationId, activeOrgId)
            ),
            columns: { status: true },
          })
        : undefined

    const previousStatus = existingReport?.status

    if (input.resolutionMessage !== undefined) {
      const effectiveStatus = input.status ?? previousStatus
      if (!effectiveStatus || !isResolvedStatus(effectiveStatus)) {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Abschlussnachricht ist nur bei Status Resolved oder Closed möglich",
        })
      }
    }

    const updated = await db
      .update(bugReport)
      .set(values)
      .where(
        and(
          eq(bugReport.id, input.id),
          eq(bugReport.organizationId, activeOrgId)
        )
      )
      .returning({
        id: bugReport.id,
        title: bugReport.title,
        status: bugReport.status,
        priority: bugReport.priority,
        visibility: bugReport.visibility,
        tags: bugReport.tags,
      })

    const report = updated[0]
    if (!report) {
      throw new ORPCError("NOT_FOUND", { message: "Bug report not found" })
    }

    const resolutionMessage = input.resolutionMessage?.trim()
    const transitionedToResolved =
      input.status !== undefined &&
      previousStatus !== undefined &&
      previousStatus !== report.status &&
      isResolvedStatus(report.status)

    if (resolutionMessage && transitionedToResolved) {
      await insertBugReportComment({
        bugReportId: report.id,
        authorUserId,
        body: resolutionMessage,
        kind: BUG_REPORT_COMMENT_KIND_OPTIONS.toReporter,
      })
    }

    if (
      input.status !== undefined &&
      previousStatus !== undefined &&
      previousStatus !== report.status
    ) {
      handleBugReportStatusTransition({
        id: report.id,
        organizationId: activeOrgId,
        previousStatus,
        newStatus: report.status,
        resolutionMessage:
          transitionedToResolved && resolutionMessage
            ? resolutionMessage
            : undefined,
      })
    }

    return {
      id: report.id,
      title: report.title,
      status: isStatus(report.status) ? report.status : statusValues[0],
      priority: priorityValues.includes(report.priority as Priority)
        ? (report.priority as Priority)
        : PRIORITY_OPTIONS.none,
      visibility: isVisibility(report.visibility)
        ? report.visibility
        : visibilityValues[1],
      tags: Array.isArray(report.tags) ? report.tags : [],
    }
  })

export const updateBugReportsBulk = protectedProcedure
  .input(bugReportBulkUpdateInputSchema)
  .handler(async ({ context, input }) => {
    const activeOrgId = requireBugReportsWriteAccess(context)
    const values = buildUpdateValues(input)
    const uniqueIds = Array.from(new Set(input.ids))

    const previousStatusById = new Map<string, string>()
    if (input.status !== undefined) {
      const existing = await db.query.bugReport.findMany({
        where: and(
          eq(bugReport.organizationId, activeOrgId),
          inArray(bugReport.id, uniqueIds)
        ),
        columns: { id: true, status: true },
      })
      for (const row of existing) {
        previousStatusById.set(row.id, row.status)
      }
    }

    const updated = await db
      .update(bugReport)
      .set(values)
      .where(
        and(
          eq(bugReport.organizationId, activeOrgId),
          inArray(bugReport.id, uniqueIds)
        )
      )
      .returning({ id: bugReport.id })

    if (input.status !== undefined) {
      for (const row of updated) {
        const previousStatus = previousStatusById.get(row.id)
        if (previousStatus && previousStatus !== input.status) {
          handleBugReportStatusTransition({
            id: row.id,
            organizationId: activeOrgId,
            previousStatus,
            newStatus: input.status,
          })
        }
      }
    }

    return {
      updatedCount: updated.length,
      ids: updated.map((row) => row.id),
    }
  })

export const updateBugReportVisibility = protectedProcedure
  .input(
    z.object({
      id: z.string().min(1),
      visibility: z.enum(visibilityValues),
    })
  )
  .handler(async ({ context, input }) => {
    const activeOrgId = requireBugReportsWriteAccess(context)

    const updated = await db
      .update(bugReport)
      .set({ visibility: input.visibility })
      .where(
        and(
          eq(bugReport.id, input.id),
          eq(bugReport.organizationId, activeOrgId)
        )
      )
      .returning({ id: bugReport.id, visibility: bugReport.visibility })

    const report = updated[0]
    if (!report) {
      throw new ORPCError("NOT_FOUND", { message: "Bug report not found" })
    }

    return {
      id: report.id,
      visibility: isVisibility(report.visibility)
        ? report.visibility
        : visibilityValues[1],
    }
  })
