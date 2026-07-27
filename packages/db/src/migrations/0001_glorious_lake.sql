CREATE TABLE "organization_api_token" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"label" text NOT NULL,
	"prefix" text NOT NULL,
	"token_hash" text NOT NULL,
	"scopes" text[] NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" text,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_api_token_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "organization_api_token" ADD CONSTRAINT "organization_api_token_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_api_token" ADD CONSTRAINT "organization_api_token_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_api_token_organizationId_idx" ON "organization_api_token" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organization_api_token_status_idx" ON "organization_api_token" USING btree ("status");--> statement-breakpoint
CREATE INDEX "organization_api_token_prefix_idx" ON "organization_api_token" USING btree ("prefix");