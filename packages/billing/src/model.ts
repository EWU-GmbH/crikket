import { env } from "@crikket/env/server"

export const BILLING_PLAN = {
  free: "free",
  pro: "pro",
  studio: "studio",
} as const

export type BillingPlan = (typeof BILLING_PLAN)[keyof typeof BILLING_PLAN]

export const BILLING_SUBSCRIPTION_STATUS = {
  active: "active",
  canceled: "canceled",
  incomplete: "incomplete",
  none: "none",
  pastDue: "past_due",
  trialing: "trialing",
  unpaid: "unpaid",
} as const

export type BillingSubscriptionStatus =
  (typeof BILLING_SUBSCRIPTION_STATUS)[keyof typeof BILLING_SUBSCRIPTION_STATUS]

export const ACTIVE_PAID_SUBSCRIPTION_STATUSES =
  new Set<BillingSubscriptionStatus>([
    BILLING_SUBSCRIPTION_STATUS.active,
    BILLING_SUBSCRIPTION_STATUS.trialing,
  ])

export type EntitlementSnapshot = {
  plan: BillingPlan
  canCreateBugReports: boolean
  canUploadVideo: boolean
  maxVideoDurationMs: number | null
  memberCap: number | null
}

export type BillingPlanLimitSnapshot = EntitlementSnapshot & {
  monthlyPriceUsd: number
}

export const billingDisabledEntitlements: EntitlementSnapshot = {
  plan: BILLING_PLAN.studio,
  canCreateBugReports: true,
  canUploadVideo: true,
  maxVideoDurationMs: null,
  memberCap: null,
}

export const billingPlanConfig: Record<BillingPlan, EntitlementSnapshot> = {
  free: {
    plan: BILLING_PLAN.free,
    canCreateBugReports: false,
    canUploadVideo: false,
    maxVideoDurationMs: 0,
    memberCap: 1,
  },
  pro: {
    plan: BILLING_PLAN.pro,
    canCreateBugReports: true,
    canUploadVideo: true,
    maxVideoDurationMs: env.BILLING_VIDEO_MAX_DURATION_MS,
    memberCap: env.BILLING_PRO_MEMBER_CAP,
  },
  studio: {
    plan: BILLING_PLAN.studio,
    canCreateBugReports: true,
    canUploadVideo: true,
    maxVideoDurationMs: env.BILLING_VIDEO_MAX_DURATION_MS,
    memberCap: null,
  },
}

export const billingPlanMonthlyPriceUsd: Record<BillingPlan, number> = {
  free: 0,
  pro: 25,
  studio: 49,
}

export function getBillingPlanLimitsSnapshot(): Record<
  BillingPlan,
  BillingPlanLimitSnapshot
> {
  return {
    free: {
      ...billingPlanConfig.free,
      monthlyPriceUsd: billingPlanMonthlyPriceUsd.free,
    },
    pro: {
      ...billingPlanConfig.pro,
      monthlyPriceUsd: billingPlanMonthlyPriceUsd.pro,
    },
    studio: {
      ...billingPlanConfig.studio,
      monthlyPriceUsd: billingPlanMonthlyPriceUsd.studio,
    },
  }
}

export function getBillingDisabledPlanLimitsSnapshot(): Record<
  BillingPlan,
  BillingPlanLimitSnapshot
> {
  return {
    free: {
      ...billingDisabledEntitlements,
      plan: BILLING_PLAN.free,
      monthlyPriceUsd: 0,
    },
    pro: {
      ...billingDisabledEntitlements,
      plan: BILLING_PLAN.pro,
      monthlyPriceUsd: 0,
    },
    studio: {
      ...billingDisabledEntitlements,
      plan: BILLING_PLAN.studio,
      monthlyPriceUsd: 0,
    },
  }
}

export function normalizeBillingPlan(value: unknown): BillingPlan {
  if (value === BILLING_PLAN.pro) {
    return BILLING_PLAN.pro
  }

  if (value === BILLING_PLAN.studio) {
    return BILLING_PLAN.studio
  }

  return BILLING_PLAN.free
}

export function normalizeBillingSubscriptionStatus(
  value: unknown
): BillingSubscriptionStatus {
  if (value === BILLING_SUBSCRIPTION_STATUS.active) {
    return BILLING_SUBSCRIPTION_STATUS.active
  }

  if (value === BILLING_SUBSCRIPTION_STATUS.trialing) {
    return BILLING_SUBSCRIPTION_STATUS.trialing
  }

  if (value === BILLING_SUBSCRIPTION_STATUS.pastDue) {
    return BILLING_SUBSCRIPTION_STATUS.pastDue
  }

  if (value === BILLING_SUBSCRIPTION_STATUS.canceled) {
    return BILLING_SUBSCRIPTION_STATUS.canceled
  }

  if (value === BILLING_SUBSCRIPTION_STATUS.unpaid) {
    return BILLING_SUBSCRIPTION_STATUS.unpaid
  }

  if (value === BILLING_SUBSCRIPTION_STATUS.incomplete) {
    return BILLING_SUBSCRIPTION_STATUS.incomplete
  }

  return BILLING_SUBSCRIPTION_STATUS.none
}

export function resolveEntitlements(input: {
  plan: BillingPlan
  subscriptionStatus: BillingSubscriptionStatus
}): EntitlementSnapshot {
  const planConfig = billingPlanConfig[input.plan]
  const isPaidPlan =
    input.plan === BILLING_PLAN.pro || input.plan === BILLING_PLAN.studio
  const isSubscriptionActive = ACTIVE_PAID_SUBSCRIPTION_STATUSES.has(
    input.subscriptionStatus
  )

  if (isPaidPlan && !isSubscriptionActive) {
    return billingPlanConfig[BILLING_PLAN.free]
  }

  return planConfig
}
