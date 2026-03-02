CREATE TABLE "bug_report_upload_session" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"reporter_id" text,
	"title" text,
	"description" text,
	"priority" text DEFAULT 'none' NOT NULL,
	"tags" text[],
	"url" text,
	"attachment_type" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"capture_key" text NOT NULL,
	"capture_content_type" text NOT NULL,
	"debugger_key" text,
	"metadata" jsonb,
	"device_info" jsonb,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bug_report_upload_session" ADD CONSTRAINT "bug_report_upload_session_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_report_upload_session" ADD CONSTRAINT "bug_report_upload_session_reporter_id_user_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bug_report_upload_session_organizationId_idx" ON "bug_report_upload_session" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "bug_report_upload_session_expiresAt_idx" ON "bug_report_upload_session" USING btree ("expires_at");