CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."audit_action" AS ENUM('created', 'updated', 'deleted', 'downloaded', 'viewed', 'signup', 'invited', 'approved', 'rejected', 'banned', 'unbanned');--> statement-breakpoint
CREATE TYPE "public"."meeting_type" AS ENUM('general', 'board', 'committee', 'special', 'annual');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."resource_type" AS ENUM('Policy', 'Procedure', 'Document', 'Vendor');--> statement-breakpoint
CREATE TYPE "public"."virus_scan_status" AS ENUM('pending', 'clean', 'infected', 'skipped');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approval_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"type" text NOT NULL,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"user_email" text NOT NULL,
	"organization" text NOT NULL,
	"action" "audit_action" NOT NULL,
	"resource_id" uuid,
	"resource_title" text,
	"resource_type" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dues_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_name" text NOT NULL,
	"year" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"paid_at" timestamp with time zone,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meeting_id" uuid NOT NULL,
	"organization_name" text NOT NULL,
	"attended" boolean DEFAULT false NOT NULL,
	"notes" text,
	"recorded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"meeting_type" "meeting_type" DEFAULT 'general' NOT NULL,
	"meeting_date" timestamp with time zone NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"email_on_approval" boolean DEFAULT true NOT NULL,
	"email_on_new_resource" boolean DEFAULT true NOT NULL,
	"email_on_meeting_reminder" boolean DEFAULT true NOT NULL,
	"email_on_dues_reminder" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "org_health_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_name" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer,
	"member_count" integer,
	"meetings_attended" integer,
	"total_meetings" integer,
	"dues_paid" boolean,
	"engagement_score" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_domain_whitelist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_name" text NOT NULL,
	"domain" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_name" text NOT NULL,
	"slug" text,
	"logo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_organization_name_unique" UNIQUE("organization_name"),
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "resource_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"resource_type" text NOT NULL,
	"external_link" text,
	"updated_by" text NOT NULL,
	"updated_by_user_id" text NOT NULL,
	"change_notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"resource_type" "resource_type" NOT NULL,
	"external_link" text,
	"organization" text NOT NULL,
	"uploaded_by" text NOT NULL,
	"status" "resource_status" DEFAULT 'active' NOT NULL,
	"archived_at" timestamp with time zone,
	"archived_by_id" text,
	"file_key" text,
	"original_filename" text,
	"mime_type" text,
	"file_size_bytes" bigint,
	"virus_scan_status" "virus_scan_status" DEFAULT 'skipped' NOT NULL,
	"allow_download" boolean DEFAULT true NOT NULL,
	"topic_area" text,
	"tags" text[],
	"search_vector" "tsvector",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"impersonated_by" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"organization_name" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"approval_status" "approval_status" DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"last_otp_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_notifications" ADD CONSTRAINT "approval_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_notifications" ADD CONSTRAINT "approval_notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dues_records" ADD CONSTRAINT "dues_records_organization_name_organizations_organization_name_fk" FOREIGN KEY ("organization_name") REFERENCES "public"."organizations"("organization_name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dues_records" ADD CONSTRAINT "dues_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_meeting_id_meetings_id_fk" FOREIGN KEY ("meeting_id") REFERENCES "public"."meetings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_organization_name_organizations_organization_name_fk" FOREIGN KEY ("organization_name") REFERENCES "public"."organizations"("organization_name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_attendance" ADD CONSTRAINT "meeting_attendance_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "org_health_metrics" ADD CONSTRAINT "org_health_metrics_organization_name_organizations_organization_name_fk" FOREIGN KEY ("organization_name") REFERENCES "public"."organizations"("organization_name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_domain_whitelist" ADD CONSTRAINT "organization_domain_whitelist_organization_name_organizations_organization_name_fk" FOREIGN KEY ("organization_name") REFERENCES "public"."organizations"("organization_name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_domain_whitelist" ADD CONSTRAINT "organization_domain_whitelist_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_files" ADD CONSTRAINT "resource_files_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_versions" ADD CONSTRAINT "resource_versions_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_organization_organizations_organization_name_fk" FOREIGN KEY ("organization") REFERENCES "public"."organizations"("organization_name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_archived_by_id_users_id_fk" FOREIGN KEY ("archived_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_name_organizations_organization_name_fk" FOREIGN KEY ("organization_name") REFERENCES "public"."organizations"("organization_name") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "resources_search_vector_idx" ON "resources" USING gin ("search_vector");