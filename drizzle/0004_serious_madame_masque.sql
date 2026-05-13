ALTER TYPE "public"."meeting_type" ADD VALUE 'monthly';--> statement-breakpoint
CREATE TABLE "org_yearly_compliance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_name" text NOT NULL,
	"year" integer NOT NULL,
	"renewal_completed_at" timestamp with time zone,
	"one_on_one_completed_at" timestamp with time zone,
	"notes" text,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "org_yearly_compliance" ADD CONSTRAINT "org_yearly_compliance_organization_name_organizations_organization_name_fk" FOREIGN KEY ("organization_name") REFERENCES "public"."organizations"("organization_name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_yearly_compliance" ADD CONSTRAINT "org_yearly_compliance_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;