CREATE TABLE "dues_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dues_record_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"paid_at" timestamp with time zone NOT NULL,
	"notes" text,
	"recorded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "org_leaders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_name" text NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"email" text,
	"phone" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meeting_attendance" ADD COLUMN "attendee_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "inactivated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dues_payments" ADD CONSTRAINT "dues_payments_dues_record_id_dues_records_id_fk" FOREIGN KEY ("dues_record_id") REFERENCES "public"."dues_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dues_payments" ADD CONSTRAINT "dues_payments_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_leaders" ADD CONSTRAINT "org_leaders_organization_name_organizations_organization_name_fk" FOREIGN KEY ("organization_name") REFERENCES "public"."organizations"("organization_name") ON DELETE cascade ON UPDATE no action;