import { db } from "@crikket/db"
import { organizationBillingAccount } from "@crikket/db/schema/billing"
import { env } from "@crikket/env/server"
import { ORPCError } from "@orpc/server"
import { eq } from "drizzle-orm"
import { polarClient } from "../lib/payments"
import {
  ACTIVE_PAID_SUBSCRIPTION_STATUSES,
  normalizeBillingPlan,
  normalizeBillingSubscriptionStatus,
} from "../model"
import { assertUserCanManageOrganizationBilling } from "./access"
import { upsertOrganizationBillingProjection } from "./entitlements"
import { resolvePlanFromProductId } from "./polar-payload"
import type { ChangeOrganizationPlanResult } from "./types"
import { getErrorMessage } from "./utils"
import { findWebhookBillingBackfill } from "./webhooks"

function resolveProductIdByPlan(plan: "pro" | "studio"): string {
  const productId =
    plan === "studio" ? env.POLAR_STUDIO_PRODUCT_ID : env.POLAR_PRO_PRODUCT_ID
  if (!productId) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: `POLAR_${plan.toUpperCase()}_PRODUCT_ID is not configured.`,
    })
  }

  return productId
}

function assertPaymentsEnabled(): void {
  if (env.ENABLE_PAYMENTS) {
    return
  }

  throw new ORPCError("BAD_REQUEST", {
    message: "Payments are disabled in this deployment.",
  })
}

export async function createOrganizationCheckoutSession(input: {
  organizationId: string
  plan: "pro" | "studio"
  userId: string
}): Promise<{ url: string }> {
  assertPaymentsEnabled()

  await assertUserCanManageOrganizationBilling({
    organizationId: input.organizationId,
    userId: input.userId,
  })

  if (!env.POLAR_SUCCESS_URL) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "POLAR_SUCCESS_URL is not configured.",
    })
  }

  const productId = resolveProductIdByPlan(input.plan)

  const existingBillingAccount =
    await db.query.organizationBillingAccount.findFirst({
      where: eq(
        organizationBillingAccount.organizationId,
        input.organizationId
      ),
      columns: {
        polarCustomerId: true,
      },
    })

  try {
    const checkout = await polarClient.checkouts.create({
      customerId: existingBillingAccount?.polarCustomerId,
      externalCustomerId: existingBillingAccount?.polarCustomerId
        ? undefined
        : input.organizationId,
      products: [productId],
      successUrl: env.POLAR_SUCCESS_URL,
      metadata: {
        initiatedByUserId: input.userId,
        plan: input.plan,
        referenceId: input.organizationId,
        source: "crikket-billing-checkout",
      },
    })

    return { url: checkout.url }
  } catch (error) {
    const message = getErrorMessage(error, "Failed to create checkout session")

    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message,
    })
  }
}

export async function changeOrganizationPlan(input: {
  organizationId: string
  plan: "pro" | "studio"
  userId: string
}): Promise<ChangeOrganizationPlanResult> {
  assertPaymentsEnabled()

  await assertUserCanManageOrganizationBilling({
    organizationId: input.organizationId,
    userId: input.userId,
  })

  const billingAccount = await db.query.organizationBillingAccount.findFirst({
    where: eq(organizationBillingAccount.organizationId, input.organizationId),
    columns: {
      plan: true,
      subscriptionStatus: true,
      polarCustomerId: true,
      polarSubscriptionId: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  })

  const nextPlan = normalizeBillingPlan(input.plan)
  const currentPlan = normalizeBillingPlan(billingAccount?.plan)
  const currentSubscriptionStatus = normalizeBillingSubscriptionStatus(
    billingAccount?.subscriptionStatus
  )

  if (currentPlan === nextPlan) {
    return {
      action: "unchanged",
      plan: nextPlan,
    }
  }

  const subscriptionId = billingAccount?.polarSubscriptionId
  const hasActivePaidSubscription =
    typeof subscriptionId === "string" &&
    subscriptionId.length > 0 &&
    ACTIVE_PAID_SUBSCRIPTION_STATUSES.has(currentSubscriptionStatus)

  if (!(billingAccount && hasActivePaidSubscription)) {
    const checkout = await createOrganizationCheckoutSession({
      organizationId: input.organizationId,
      plan: input.plan,
      userId: input.userId,
    })

    return {
      action: "checkout_required",
      plan: nextPlan,
      url: checkout.url,
    }
  }

  const targetProductId = resolveProductIdByPlan(input.plan)

  try {
    const subscription = await polarClient.subscriptions.update({
      id: subscriptionId,
      subscriptionUpdate: {
        productId: targetProductId,
      },
    })

    const resolvedPlan =
      resolvePlanFromProductId(subscription.productId) ??
      normalizeBillingPlan(input.plan)
    const resolvedSubscriptionStatus = normalizeBillingSubscriptionStatus(
      subscription.status
    )

    await upsertOrganizationBillingProjection({
      organizationId: input.organizationId,
      plan: resolvedPlan,
      subscriptionStatus: resolvedSubscriptionStatus,
      polarCustomerId:
        subscription.customerId ?? billingAccount.polarCustomerId ?? undefined,
      polarSubscriptionId: subscription.id,
      currentPeriodStart:
        subscription.currentPeriodStart ??
        billingAccount.currentPeriodStart ??
        undefined,
      currentPeriodEnd:
        subscription.currentPeriodEnd ??
        billingAccount.currentPeriodEnd ??
        undefined,
      cancelAtPeriodEnd:
        subscription.cancelAtPeriodEnd ??
        billingAccount.cancelAtPeriodEnd ??
        false,
      source: "manual-change-plan",
    })

    return {
      action: "updated",
      plan: resolvedPlan,
    }
  } catch (error) {
    const message = getErrorMessage(error, "Failed to change organization plan")

    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message,
    })
  }
}

export async function createOrganizationPortalSession(input: {
  organizationId: string
  userId: string
}): Promise<{ url: string }> {
  assertPaymentsEnabled()

  await assertUserCanManageOrganizationBilling({
    organizationId: input.organizationId,
    userId: input.userId,
  })

  const billingAccount = await db.query.organizationBillingAccount.findFirst({
    where: eq(organizationBillingAccount.organizationId, input.organizationId),
    columns: {
      polarCustomerId: true,
      polarSubscriptionId: true,
    },
  })

  let portalCustomerId = billingAccount?.polarCustomerId
  let portalSubscriptionId = billingAccount?.polarSubscriptionId
  const recoveryFailures: string[] = []

  if (!(portalCustomerId && portalSubscriptionId)) {
    const webhookBackfill = await findWebhookBillingBackfill(
      input.organizationId
    )
    if (webhookBackfill) {
      portalCustomerId = portalCustomerId ?? webhookBackfill.polarCustomerId
      portalSubscriptionId =
        portalSubscriptionId ?? webhookBackfill.polarSubscriptionId

      await upsertOrganizationBillingProjection({
        organizationId: input.organizationId,
        plan: webhookBackfill.plan,
        subscriptionStatus: webhookBackfill.subscriptionStatus,
        polarCustomerId: webhookBackfill.polarCustomerId,
        polarSubscriptionId: webhookBackfill.polarSubscriptionId,
        currentPeriodStart: webhookBackfill.currentPeriodStart,
        currentPeriodEnd: webhookBackfill.currentPeriodEnd,
        cancelAtPeriodEnd: webhookBackfill.cancelAtPeriodEnd,
        source: "portal-recovery",
      })
    }
  }

  if (!portalCustomerId && portalSubscriptionId) {
    try {
      const subscription = await polarClient.subscriptions.get({
        id: portalSubscriptionId,
      })
      portalCustomerId = subscription.customerId
    } catch (error) {
      recoveryFailures.push(
        `subscription lookup failed (${getErrorMessage(error, "unknown error")})`
      )
    }
  }

  if (!portalCustomerId) {
    try {
      const customerSession = await polarClient.customerSessions.create({
        externalCustomerId: input.organizationId,
        returnUrl: env.POLAR_SUCCESS_URL ?? undefined,
      })

      return { url: customerSession.customerPortalUrl }
    } catch (error) {
      recoveryFailures.push(
        `external customer portal lookup failed (${getErrorMessage(error, "unknown error")})`
      )
    }
  }

  if (!portalCustomerId) {
    const recoveryHint =
      recoveryFailures.length > 0
        ? ` Recovery attempts failed (${recoveryFailures.join("; ")}).`
        : ""
    throw new ORPCError("BAD_REQUEST", {
      message: `No billing customer found for this organization. Start a Pro or Studio checkout first.${recoveryHint}`,
    })
  }

  try {
    const customerSession = await polarClient.customerSessions.create({
      customerId: portalCustomerId,
      returnUrl: env.POLAR_SUCCESS_URL ?? undefined,
    })

    return { url: customerSession.customerPortalUrl }
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Failed to create customer portal session"
    )

    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message,
    })
  }
}
