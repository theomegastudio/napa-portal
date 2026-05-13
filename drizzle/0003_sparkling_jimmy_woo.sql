ALTER TABLE "organizations" ADD COLUMN "member_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;