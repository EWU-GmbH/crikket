CREATE TABLE "bug_report_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"bug_report_id" text NOT NULL,
	"kind" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"filename" text,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" bigint,
	"uploaded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bug_report_attachment_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "bug_report_upload_session_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"upload_session_id" text NOT NULL,
	"client_id" text NOT NULL,
	"kind" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"filename" text,
	"object_key" text NOT NULL,
	"content_type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bug_report_upload_session_attachment_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
ALTER TABLE "bug_report_attachment" ADD CONSTRAINT "bug_report_attachment_bug_report_id_bug_report_id_fk" FOREIGN KEY ("bug_report_id") REFERENCES "public"."bug_report"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bug_report_upload_session_attachment" ADD CONSTRAINT "bug_report_upload_session_attachment_upload_session_id_bug_report_upload_session_id_fk" FOREIGN KEY ("upload_session_id") REFERENCES "public"."bug_report_upload_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bug_report_attachment_bugReportId_idx" ON "bug_report_attachment" USING btree ("bug_report_id");--> statement-breakpoint
CREATE INDEX "bug_report_upload_session_attachment_sessionId_idx" ON "bug_report_upload_session_attachment" USING btree ("upload_session_id");
