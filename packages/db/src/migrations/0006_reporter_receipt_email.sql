ALTER TABLE "organization" ADD COLUMN "reporter_receipt_email_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "bug_report" ADD COLUMN "receipt_notified_at" timestamp;--> statement-breakpoint
UPDATE "bug_report" SET "receipt_notified_at" = "created_at" WHERE "receipt_notified_at" IS NULL;
