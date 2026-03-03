DELETE FROM "bug_report" WHERE "submission_status" = 'pending_upload';--> statement-breakpoint
DROP TABLE "bug_report_storage_cleanup" CASCADE;--> statement-breakpoint
ALTER TABLE "bug_report" DROP COLUMN "attachment_url";--> statement-breakpoint
ALTER TABLE "bug_report" DROP COLUMN "attachment_key";
