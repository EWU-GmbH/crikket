CREATE TABLE "feature_request" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"reporter_email" text,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'open' NOT NULL,
	"kan_card_public_id" text,
	"resolution_notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "reporter_email" text;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "kan_card_public_id" text;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "resolution_notified_at" timestamp;--> statement-breakpoint
ALTER TABLE "bug_report_upload_session" ADD COLUMN "reporter_email" text;--> statement-breakpoint
ALTER TABLE "feature_request" ADD CONSTRAINT "feature_request_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feature_request_organizationId_idx" ON "feature_request" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "feature_request_kanCardPublicId_idx" ON "feature_request" USING btree ("kan_card_public_id");--> statement-breakpoint
CREATE INDEX "bug_report_kanCardPublicId_idx" ON "bug_report" USING btree ("kan_card_public_id");
