import { relations } from "drizzle-orm"
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { organization, user } from "./auth"

export const organizationApiToken = pgTable(
  "organization_api_token",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    prefix: text("prefix").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    scopes: text("scopes").array().notNull(),
    status: text("status").default("active").notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("organization_api_token_organizationId_idx").on(table.organizationId),
    index("organization_api_token_status_idx").on(table.status),
    index("organization_api_token_prefix_idx").on(table.prefix),
  ]
)

export const organizationApiTokenRelations = relations(
  organizationApiToken,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationApiToken.organizationId],
      references: [organization.id],
    }),
    creator: one(user, {
      fields: [organizationApiToken.createdBy],
      references: [user.id],
    }),
  })
)
