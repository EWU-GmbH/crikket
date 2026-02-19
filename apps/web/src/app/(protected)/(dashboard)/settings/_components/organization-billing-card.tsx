"use client"

import { ConfirmationDialog } from "@crikket/ui/components/dialogs/confirmation-dialog"
import { Badge } from "@crikket/ui/components/ui/badge"
import { Button } from "@crikket/ui/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@crikket/ui/components/ui/card"
import { useMutation } from "@tanstack/react-query"
import { useRouter } from "nextjs-toploader/app"
import * as React from "react"
import { toast } from "sonner"

import { client } from "@/utils/orpc"

type BillingPlan = "free" | "pro" | "studio"
type SwitchablePlan = "pro" | "studio"

type BillingPlanLimits = Record<
  BillingPlan,
  {
    monthlyPriceUsd: number
    canUploadVideo: boolean
    maxVideoDurationMs: number | null
    memberCap: number | null
  }
>

interface OrganizationBillingCardProps {
  organizationId: string
  canManageBilling: boolean
  limits: BillingPlanLimits | null
  memberCap: number | null
  memberCount: number
  plan: BillingPlan
  subscriptionStatus: string
  currentPeriodEnd: string | Date | null
}

type PlanOption = {
  slug: SwitchablePlan
  description: string
  price: number
}

const DEFAULT_PLAN_PRICE = {
  pro: 25,
  studio: 49,
} as const

function formatPlanLabel(plan: BillingPlan): string {
  if (plan === "pro") return "Pro"
  if (plan === "studio") return "Studio"
  return "Free"
}

function formatSubscriptionStatus(status: string): string {
  if (!status || status === "none") return "Not subscribed"
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function planBadgeVariant(
  plan: BillingPlan
): "default" | "secondary" | "outline" {
  if (plan === "studio") return "default"
  if (plan === "pro") return "secondary"
  return "outline"
}

function getErrorMessage(
  error: { message?: string } | null | undefined,
  fallback = "Request failed"
): string {
  return error?.message ?? fallback
}

function extractRedirectUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") {
    return null
  }

  const candidate = (data as { url?: unknown }).url
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : null
}

function formatVideoDurationLabel(durationMs: number | null): string {
  if (durationMs === null) {
    return "Unlimited"
  }

  if (typeof durationMs !== "number" || durationMs <= 0) {
    return "Locked"
  }

  const minutes = Math.floor(durationMs / 60_000)
  if (minutes < 60) {
    return `${minutes} minutes per recording`
  }

  const hours = (durationMs / 3_600_000).toFixed(1)
  return `${hours} hours per recording`
}

function formatMoneyPerMonth(monthlyPriceUsd: number): string {
  return `$${monthlyPriceUsd}/month`
}

function formatDateLabel(value: string | Date | null): string | null {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function setCheckoutPendingGuard(): void {
  try {
    window.sessionStorage.setItem(
      "crikket:billing:checkout-pending",
      JSON.stringify({
        createdAt: Date.now(),
      })
    )
  } catch (_error) {
    // Ignore storage failures (e.g. privacy mode); checkout flow should proceed.
  }
}

function getPlanSwitchActionLabel(input: {
  currentPlan: BillingPlan
  nextPlan: SwitchablePlan
}): string {
  if (input.currentPlan === "free") {
    return `Choose ${formatPlanLabel(input.nextPlan)}`
  }

  if (input.currentPlan === "pro" && input.nextPlan === "studio") {
    return "Upgrade to Studio"
  }

  return "Switch to Pro"
}

function useBillingActions(organizationId: string) {
  const router = useRouter()
  const [pendingPlan, setPendingPlan] = React.useState<SwitchablePlan | null>(
    null
  )
  const [isPlanConfirmOpen, setIsPlanConfirmOpen] = React.useState(false)

  const changePlanMutation = useMutation({
    mutationFn: async (nextPlan: SwitchablePlan) => {
      const data = await client.billing.changePlan({
        organizationId,
        plan: nextPlan,
      })

      if (data.action === "checkout_required") {
        setCheckoutPendingGuard()
        window.location.assign(data.url)
      }

      return data
    },
    onSuccess: (data, nextPlan) => {
      if (data.action === "checkout_required") {
        return
      }

      if (data.action === "updated") {
        toast.success(
          `Organization plan updated to ${nextPlan === "pro" ? "Pro" : "Studio"}.`
        )
      } else {
        toast.message("Organization is already on that plan.")
      }

      router.refresh()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to change plan"))
    },
  })

  const portalMutation = useMutation({
    mutationFn: async () => {
      const data = await client.billing.openPortal({ organizationId })
      const url = extractRedirectUrl(data)
      if (!url) {
        throw new Error("Portal URL is missing from response.")
      }

      window.location.assign(url)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to open billing portal"))
    },
  })

  const handlePlanDialogOpenChange = (open: boolean) => {
    setIsPlanConfirmOpen(open)
    if (!open) {
      setPendingPlan(null)
    }
  }

  return {
    pendingPlan,
    isPlanConfirmOpen,
    isMutating: changePlanMutation.isPending || portalMutation.isPending,
    isPlanChangePending: changePlanMutation.isPending,
    handlePlanDialogOpenChange,
    handlePlanSelection: (nextPlan: SwitchablePlan) => {
      setPendingPlan(nextPlan)
      setIsPlanConfirmOpen(true)
    },
    handleConfirmPlanChange: async () => {
      if (!pendingPlan) {
        return
      }

      await changePlanMutation.mutateAsync(pendingPlan)
    },
    openPortal: () => portalMutation.mutate(),
  }
}

function BillingSummary(props: {
  currentPeriodEnd: string | Date | null
  currentPlanLimit: BillingPlanLimits[BillingPlan] | null
  currentPlanPrice: number
  memberCap: number | null
  memberCount: number
  plan: BillingPlan
  proMemberCap: number
  subscriptionStatus: string
}) {
  const memberLimitLabel =
    props.memberCap === null
      ? "Unlimited"
      : `${props.memberCap.toLocaleString()} members`
  const renewalDate = formatDateLabel(props.currentPeriodEnd)
  const exceedsProMemberCap =
    props.plan === "studio" && props.memberCount > props.proMemberCap

  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={planBadgeVariant(props.plan)}>
          {formatPlanLabel(props.plan)}
        </Badge>
        <span className="text-muted-foreground text-sm">
          {formatSubscriptionStatus(props.subscriptionStatus)}
        </span>
      </div>

      <p className="mt-3 font-medium text-sm">
        Current price: {formatMoneyPerMonth(props.currentPlanPrice)}
      </p>
      <p className="mt-1 text-muted-foreground text-sm">
        {renewalDate
          ? `Next renewal: ${renewalDate}`
          : "No renewal date available yet."}
      </p>

      <div className="mt-3 space-y-1 text-sm">
        <p>
          Members: {props.memberCount.toLocaleString()} / {memberLimitLabel}
        </p>
        <p>
          Video limit:{" "}
          {props.currentPlanLimit?.canUploadVideo
            ? formatVideoDurationLabel(
                props.currentPlanLimit.maxVideoDurationMs
              )
            : "Locked"}
        </p>
      </div>

      {exceedsProMemberCap ? (
        <p className="mt-2 text-muted-foreground text-sm">
          Downgrading to Pro keeps current members, but new invites are blocked
          while you are above {props.proMemberCap} members.
        </p>
      ) : null}
    </div>
  )
}

function PlanOptionCard(props: {
  currentPlan: BillingPlan
  canManageBilling: boolean
  isMutating: boolean
  option: PlanOption
  onSelect: (nextPlan: SwitchablePlan) => void
}) {
  const isCurrentPlan = props.currentPlan === props.option.slug
  const actionLabel = getPlanSwitchActionLabel({
    currentPlan: props.currentPlan,
    nextPlan: props.option.slug,
  })

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{formatPlanLabel(props.option.slug)}</p>
        {isCurrentPlan ? (
          <Badge variant={planBadgeVariant(props.option.slug)}>Current</Badge>
        ) : null}
      </div>
      <p className="mt-1 text-muted-foreground text-sm">
        {props.option.description}
      </p>
      <p className="mt-2 font-medium text-sm">
        {formatMoneyPerMonth(props.option.price)}
      </p>

      <Button
        className="mt-3"
        disabled={props.isMutating || isCurrentPlan || !props.canManageBilling}
        onClick={() => props.onSelect(props.option.slug)}
        variant={isCurrentPlan ? "outline" : "default"}
      >
        {isCurrentPlan ? "Current plan" : actionLabel}
      </Button>
    </div>
  )
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: the page intentionally composes multiple billing states and actions in one view component.
export function OrganizationBillingCard({
  organizationId,
  canManageBilling,
  limits,
  memberCap,
  memberCount,
  plan,
  subscriptionStatus,
  currentPeriodEnd,
}: OrganizationBillingCardProps) {
  const proPrice = limits?.pro.monthlyPriceUsd ?? DEFAULT_PLAN_PRICE.pro
  const studioPrice =
    limits?.studio.monthlyPriceUsd ?? DEFAULT_PLAN_PRICE.studio
  const currentPlanPrice =
    plan === "pro" ? proPrice : plan === "studio" ? studioPrice : 0
  const isBillingEnabled = proPrice > 0 || studioPrice > 0
  const currentPlanLimit = limits?.[plan] ?? null
  const proMemberCap = limits?.pro.memberCap ?? 15
  const planOptions: PlanOption[] = [
    {
      slug: "pro",
      description: "For growing teams with up to 15 members",
      price: proPrice,
    },
    {
      slug: "studio",
      description: "For teams that need unlimited seats",
      price: studioPrice,
    },
  ]

  const actions = useBillingActions(organizationId)
  const pendingPlanPrice =
    actions.pendingPlan === "pro"
      ? proPrice
      : actions.pendingPlan === "studio"
        ? studioPrice
        : 0
  const canOpenPortal = plan !== "free" && canManageBilling && isBillingEnabled

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Billing</CardTitle>
        <CardDescription>
          {isBillingEnabled
            ? "Billing is scoped to the active workspace."
            : "Billing is disabled for this deployment. All features are unlocked."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <BillingSummary
          currentPeriodEnd={currentPeriodEnd}
          currentPlanLimit={currentPlanLimit}
          currentPlanPrice={currentPlanPrice}
          memberCap={memberCap}
          memberCount={memberCount}
          plan={plan}
          proMemberCap={proMemberCap}
          subscriptionStatus={subscriptionStatus}
        />

        {isBillingEnabled ? (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Available plans</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {planOptions.map((option) => (
                <PlanOptionCard
                  canManageBilling={canManageBilling}
                  currentPlan={plan}
                  isMutating={actions.isMutating}
                  key={option.slug}
                  onSelect={actions.handlePlanSelection}
                  option={option}
                />
              ))}
            </div>
          </div>
        ) : null}

        {canManageBilling && isBillingEnabled ? (
          <div className="flex flex-wrap gap-2">
            {canOpenPortal ? (
              <Button
                disabled={actions.isMutating}
                onClick={actions.openPortal}
                variant="outline"
              >
                Open Billing Portal
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            {isBillingEnabled
              ? "Only organization owners can manage billing."
              : "Payments are disabled in this deployment."}
          </p>
        )}
      </CardContent>

      <ConfirmationDialog
        cancelText="Keep current plan"
        confirmText={
          actions.pendingPlan
            ? `Confirm ${formatPlanLabel(actions.pendingPlan)}`
            : "Confirm"
        }
        description={
          actions.pendingPlan
            ? `Switch this organization to ${formatPlanLabel(actions.pendingPlan)} at ${formatMoneyPerMonth(
                pendingPlanPrice
              )}. Polar applies changes according to your billing configuration, including prorations when applicable.`
            : ""
        }
        isLoading={actions.isPlanChangePending}
        onConfirm={actions.handleConfirmPlanChange}
        onOpenChange={actions.handlePlanDialogOpenChange}
        open={actions.isPlanConfirmOpen}
        title={
          actions.pendingPlan
            ? `Change plan to ${formatPlanLabel(actions.pendingPlan)}?`
            : "Change plan"
        }
      />
    </Card>
  )
}
