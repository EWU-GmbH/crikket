import { db } from "@crikket/db"
import { member, organization } from "@crikket/db/schema/auth"
import { ORPCError } from "@orpc/server"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { isReporterReceiptEmailEnabled } from "../lib/notifications/receipt-policy"
import { sessionProcedure } from "./context"

const organizationIdInputSchema = z.object({
  organizationId: z.string().min(1),
})

const updateReporterReceiptEmailSettingInputSchema =
  organizationIdInputSchema.extend({
    enabled: z.boolean(),
  })

async function requireMembership(input: {
  organizationId: string
  userId: string
}): Promise<{ role: string }> {
  const membership = await db.query.member.findFirst({
    where: and(
      eq(member.organizationId, input.organizationId),
      eq(member.userId, input.userId)
    ),
    columns: { role: true },
  })

  if (!membership) {
    throw new ORPCError("FORBIDDEN", {
      message: "You are not a member of this organization.",
    })
  }

  return membership
}

function assertOrgAdmin(role: string): void {
  if (role === "owner" || role === "admin") {
    return
  }

  throw new ORPCError("FORBIDDEN", {
    message:
      "Nur Organisations-Admins oder Owner können die Bestätigungsmail ändern.",
  })
}

export const getReporterReceiptEmailSetting = sessionProcedure
  .input(organizationIdInputSchema)
  .handler(async ({ context, input }) => {
    await requireMembership({
      organizationId: input.organizationId,
      userId: context.session.user.id,
    })

    const record = await db.query.organization.findFirst({
      where: eq(organization.id, input.organizationId),
      columns: { reporterReceiptEmailEnabled: true },
    })

    return {
      enabled: isReporterReceiptEmailEnabled(
        record?.reporterReceiptEmailEnabled
      ),
    }
  })

export const updateReporterReceiptEmailSetting = sessionProcedure
  .input(updateReporterReceiptEmailSettingInputSchema)
  .handler(async ({ context, input }) => {
    const membership = await requireMembership({
      organizationId: input.organizationId,
      userId: context.session.user.id,
    })
    assertOrgAdmin(membership.role)

    const updated = await db
      .update(organization)
      .set({ reporterReceiptEmailEnabled: input.enabled })
      .where(eq(organization.id, input.organizationId))
      .returning({ id: organization.id })

    if (updated.length === 0) {
      throw new ORPCError("NOT_FOUND", { message: "Organization not found" })
    }

    return { enabled: input.enabled }
  })
