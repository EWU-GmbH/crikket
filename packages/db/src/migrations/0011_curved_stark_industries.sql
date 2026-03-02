CREATE TABLE "bug_report_artifact_cleanup" (
	"id" text PRIMARY KEY NOT NULL,
	"artifact_kind" text NOT NULL,
	"object_key" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bug_report_artifact_cleanup_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "bug_report_ingestion_job" (
	"id" text PRIMARY KEY NOT NULL,
	"bug_report_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "capture_key" text;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "capture_content_type" text;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "capture_size_bytes" bigint;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "capture_uploaded_at" timestamp;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "thumbnail_key" text;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "thumbnail_content_type" text;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "debugger_key" text;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "debugger_content_encoding" text;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "debugger_size_bytes" bigint;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "debugger_uploaded_at" timestamp;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "debugger_ingestion_status" text DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "debugger_ingestion_error" text;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "debugger_ingested_at" timestamp;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "submission_status" text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "bug_report_ingestion_job" ADD CONSTRAINT "bug_report_ingestion_job_bug_report_id_bug_report_id_fk" FOREIGN KEY ("bug_report_id") REFERENCES "public"."bug_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_report_ingestion_job" ADD CONSTRAINT "bug_report_ingestion_job_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bug_report_artifact_cleanup_nextAttemptAt_idx" ON "bug_report_artifact_cleanup" USING btree ("next_attempt_at");--> statement-breakpoint
CREATE INDEX "bug_report_ingestion_job_bugReportId_idx" ON "bug_report_ingestion_job" USING btree ("bug_report_id");--> statement-breakpoint
CREATE INDEX "bug_report_ingestion_job_status_idx" ON "bug_report_ingestion_job" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bug_report_ingestion_job_nextAttemptAt_idx" ON "bug_report_ingestion_job" USING btree ("next_attempt_at");--> statement-breakpoint
CREATE INDEX "bug_report_submissionStatus_idx" ON "bug_report" USING btree ("submission_status");--> statement-breakpoint
CREATE INDEX "bug_report_debuggerIngestionStatus_idx" ON "bug_report" USING btree ("debugger_ingestion_status");