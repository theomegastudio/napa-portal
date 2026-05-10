// Applies incremental schema migrations to the existing database
import pg from 'pg';
import { config } from 'dotenv';

config({ path: '.env.local' });

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await client.connect();

const statements = [
  // New enum types
  `DO $$ BEGIN
    CREATE TYPE "public"."resource_status" AS ENUM('active', 'archived');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,

  `DO $$ BEGIN
    CREATE TYPE "public"."virus_scan_status" AS ENUM('pending', 'clean', 'infected', 'skipped');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,

  `DO $$ BEGIN
    CREATE TYPE "public"."meeting_type" AS ENUM('general', 'board', 'committee', 'special', 'annual');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,

  // Organizations: new columns
  `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "slug" text`,
  `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "logo_url" text`,
  `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL`,

  // Make slug unique (nullable columns with NULL don't violate unique constraint)
  `DO $$ BEGIN
    ALTER TABLE "organizations" ADD CONSTRAINT "organizations_slug_unique" UNIQUE ("slug");
  EXCEPTION WHEN duplicate_table THEN null; END $$`,

  // Resources: new columns
  `ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "status" "resource_status" DEFAULT 'active' NOT NULL`,
  `ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone`,
  `ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "archived_by_id" text REFERENCES "users"("id") ON DELETE SET NULL`,
  `ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "file_key" text`,
  `ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "original_filename" text`,
  `ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "mime_type" text`,
  `ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "file_size_bytes" bigint`,
  `ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "virus_scan_status" "virus_scan_status" DEFAULT 'skipped' NOT NULL`,
  `ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "allow_download" boolean DEFAULT true NOT NULL`,
  `ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "topic_area" text`,
  `ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "tags" text[]`,
  `ALTER TABLE "resources" ADD COLUMN IF NOT EXISTS "search_vector" tsvector`,

  // GIN index for full-text search
  `CREATE INDEX IF NOT EXISTS "resources_search_vector_idx" ON "resources" USING gin ("search_vector")`,

  // New tables
  `CREATE TABLE IF NOT EXISTS "dues_records" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "organization_name" text NOT NULL REFERENCES "organizations"("organization_name") ON DELETE CASCADE,
    "year" integer NOT NULL,
    "amount_cents" integer NOT NULL,
    "paid_at" timestamp with time zone,
    "notes" text,
    "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "meetings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "title" text NOT NULL,
    "meeting_type" "meeting_type" DEFAULT 'general' NOT NULL,
    "meeting_date" timestamp with time zone NOT NULL,
    "notes" text,
    "created_by" text REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "meeting_attendance" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "meeting_id" uuid NOT NULL REFERENCES "meetings"("id") ON DELETE CASCADE,
    "organization_name" text NOT NULL REFERENCES "organizations"("organization_name") ON DELETE CASCADE,
    "attended" boolean DEFAULT false NOT NULL,
    "notes" text,
    "recorded_by" text REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "org_health_metrics" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "organization_name" text NOT NULL REFERENCES "organizations"("organization_name") ON DELETE CASCADE,
    "year" integer NOT NULL,
    "month" integer,
    "member_count" integer,
    "meetings_attended" integer,
    "total_meetings" integer,
    "dues_paid" boolean,
    "engagement_score" integer,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,

  `CREATE TABLE IF NOT EXISTS "notification_preferences" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" text NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
    "email_on_approval" boolean DEFAULT true NOT NULL,
    "email_on_new_resource" boolean DEFAULT true NOT NULL,
    "email_on_meeting_reminder" boolean DEFAULT true NOT NULL,
    "email_on_dues_reminder" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
  )`,
];

let passed = 0;
let failed = 0;

for (const stmt of statements) {
  const preview = stmt.trim().replace(/\s+/g, ' ').slice(0, 80);
  try {
    await client.query(stmt);
    console.log(`✓ ${preview}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${preview}`);
    console.error(`  ${err.message}`);
    failed++;
  }
}

await client.end();
console.log(`\nDone: ${passed} passed, ${failed} failed`);
