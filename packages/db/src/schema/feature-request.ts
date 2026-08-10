import { relations } from "drizzle-orm"
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { organization, user } from "./auth"

export const featureRequest = pgTable(
  "feature_request",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    reporterEmail: text("reporter_email"),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").default("open").notNull(), // open, in_progress, resolved, closed
    kanCardPublicId: text("kan_card_public_id"),
    resolutionNotifiedAt: timestamp("resolution_notified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("feature_request_organizationId_idx").on(table.organizationId),
    index("feature_request_kanCardPublicId_idx").on(table.kanCardPublicId),
  ]
)

export const featureRequestComment = pgTable(
  "feature_request_comment",
  {
    id: text("id").primaryKey(),
    featureRequestId: text("feature_request_id")
      .notNull()
      .references(() => featureRequest.id, { onDelete: "cascade" }),
    authorUserId: text("author_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    body: text("body").notNull(),
    kind: text("kind").notNull(), // to_reporter | internal
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("feature_request_comment_featureRequestId_idx").on(
      table.featureRequestId
    ),
  ]
)

export const featureRequestRelations = relations(
  featureRequest,
  ({ one, many }) => ({
    organization: one(organization, {
      fields: [featureRequest.organizationId],
      references: [organization.id],
    }),
    comments: many(featureRequestComment),
  })
)

export const featureRequestCommentRelations = relations(
  featureRequestComment,
  ({ one }) => ({
    featureRequest: one(featureRequest, {
      fields: [featureRequestComment.featureRequestId],
      references: [featureRequest.id],
    }),
    author: one(user, {
      fields: [featureRequestComment.authorUserId],
      references: [user.id],
    }),
  })
)
