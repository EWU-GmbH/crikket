import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { organization } from "./auth"

export const organizationBillingAccount = pgTable(
  "organization_billing_account",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    provider: text("provider").default("polar").notNull(),
    polarCustomerId: text("polar_customer_id").unique(),
    polarSubscriptionId: text("polar_subscription_id").unique(),
    plan: text("plan").default("free").notNull(),
    subscriptionStatus: text("subscription_status").default("none").notNull(),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    lastWebhookAt: timestamp("last_webhook_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("org_billing_plan_idx").on(table.plan)]
)

export const organizationEntitlement = pgTable(
  "organization_entitlement",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    plan: text("plan").default("free").notNull(),
    canCreateBugReports: boolean("can_create_bug_reports")
      .default(false)
      .notNull(),
    canUploadVideo: boolean("can_upload_video").default(false).notNull(),
    maxVideoDurationMs: integer("max_video_duration_ms"),
    memberCap: integer("member_cap"),
    lastComputedAt: timestamp("last_computed_at").defaultNow().notNull(),
    source: text("source").default("reconciliation").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("org_entitlement_plan_idx").on(table.plan)]
)

export const billingWebhookEvent = pgTable(
  "billing_webhook_event",
  {
    id: text("id").primaryKey(),
    providerEventId: text("provider_event_id").notNull().unique(),
    provider: text("provider").default("polar").notNull(),
    eventType: text("event_type").notNull(),
    receivedAt: timestamp("received_at").defaultNow().notNull(),
    processedAt: timestamp("processed_at"),
    status: text("status").default("received").notNull(),
    attemptCount: integer("attempt_count").default(1).notNull(),
    errorMessage: text("error_message"),
    payload: jsonb("payload").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("billing_webhook_event_type_idx").on(table.eventType),
    index("billing_webhook_status_idx").on(table.status),
  ]
)

export const organizationBillingAccountRelations = relations(
  organizationBillingAccount,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationBillingAccount.organizationId],
      references: [organization.id],
    }),
  })
)

export const organizationEntitlementRelations = relations(
  organizationEntitlement,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationEntitlement.organizationId],
      references: [organization.id],
    }),
  })
)
