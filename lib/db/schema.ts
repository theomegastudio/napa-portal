import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  bigint,
  jsonb,
  pgEnum,
  index,
  customType,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

const tsvector = customType<{ data: string }>({
  dataType() { return 'tsvector' },
});

// ============================================
// Enums
// ============================================

export const resourceTypeEnum = pgEnum('resource_type', [
  'Policy',
  'Procedure',
  'Document',
  'Vendor',
]);

export const resourceStatusEnum = pgEnum('resource_status', [
  'active',
  'archived',
]);

export const virusScanStatusEnum = pgEnum('virus_scan_status', [
  'pending',
  'clean',
  'infected',
  'skipped',
]);

export const auditActionEnum = pgEnum('audit_action', [
  'created',
  'updated',
  'deleted',
  'downloaded',
  'viewed',
  'signup',
  'invited',
  'approved',
  'rejected',
  'banned',
  'unbanned',
]);

export const approvalStatusEnum = pgEnum('approval_status', [
  'pending',
  'approved',
  'rejected',
]);

// ============================================
// Core Application Tables
// ============================================

// Organizations table
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationName: text('organization_name').notNull().unique(),
  slug: text('slug').unique(),
  logoUrl: text('logo_url'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Users table - Compatible with BetterAuth
export const users = pgTable('users', {
  id: text('id').primaryKey(), // BetterAuth uses text IDs
  email: text('email').notNull().unique(),
  name: text('name'),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),

  // BetterAuth admin plugin fields
  role: text('role').default('user').notNull(), // 'user', 'admin', 'napaAdmin'
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires', { withTimezone: true }),

  // Custom NAPA fields
  organizationName: text('organization_name').references(
    () => organizations.organizationName
  ),
  isAdmin: boolean('is_admin').default(false).notNull(),

  // Approval workflow fields
  approvalStatus: approvalStatusEnum('approval_status').default('pending').notNull(),
  approvedBy: text('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),

  // OTP verification tracking (60-day validity)
  lastOtpVerifiedAt: timestamp('last_otp_verified_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Resources table
export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  resourceType: resourceTypeEnum('resource_type').notNull(),
  externalLink: text('external_link'),
  organization: text('organization')
    .notNull()
    .references(() => organizations.organizationName),
  uploadedBy: text('uploaded_by').notNull(),

  // Status & archive
  status: resourceStatusEnum('status').default('active').notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedById: text('archived_by_id').references(() => users.id, { onDelete: 'set null' }),

  // File metadata (R2 storage)
  fileKey: text('file_key'),
  originalFilename: text('original_filename'),
  mimeType: text('mime_type'),
  fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),
  virusScanStatus: virusScanStatusEnum('virus_scan_status').default('skipped').notNull(),
  allowDownload: boolean('allow_download').default(true).notNull(),

  // Categorization
  topicArea: text('topic_area'),
  tags: text('tags').array(),

  // Full-text search vector
  searchVector: tsvector('search_vector'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('resources_search_vector_idx').using('gin', table.searchVector),
]);

// Resource files table
export const resourceFiles = pgTable('resource_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  resourceId: uuid('resource_id')
    .notNull()
    .references(() => resources.id, { onDelete: 'cascade' }),
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Audit logs table
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  userEmail: text('user_email').notNull(),
  organization: text('organization').notNull(),
  action: auditActionEnum('action').notNull(),
  resourceId: uuid('resource_id'),
  resourceTitle: text('resource_title'),
  resourceType: text('resource_type'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Resource versions table
export const resourceVersions = pgTable('resource_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  resourceId: uuid('resource_id')
    .notNull()
    .references(() => resources.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  resourceType: text('resource_type').notNull(),
  externalLink: text('external_link'),
  updatedBy: text('updated_by').notNull(),
  updatedByUserId: text('updated_by_user_id').notNull(),
  changeNotes: text('change_notes'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// Approval Workflow Tables
// ============================================

// Organization domain whitelist - auto-approve users with whitelisted email domains
export const organizationDomainWhitelist = pgTable('organization_domain_whitelist', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationName: text('organization_name')
    .notNull()
    .references(() => organizations.organizationName, { onDelete: 'cascade' }),
  domain: text('domain').notNull(), // e.g., 'example.edu'
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Approval notifications for admins
export const approvalNotifications = pgTable('approval_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  recipientId: text('recipient_id')
    .notNull()
    .references(() => users.id),
  type: text('type').notNull(), // 'pending_approval', 'approved', 'rejected'
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// Org Health & Engagement Tables
// ============================================

export const duesRecords = pgTable('dues_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationName: text('organization_name')
    .notNull()
    .references(() => organizations.organizationName, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  amountCents: integer('amount_cents').notNull(), // stored in cents to avoid float precision
  paidAt: timestamp('paid_at', { withTimezone: true }),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const meetingTypeEnum = pgEnum('meeting_type', [
  'general',
  'board',
  'committee',
  'special',
  'annual',
]);

export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  meetingType: meetingTypeEnum('meeting_type').default('general').notNull(),
  meetingDate: timestamp('meeting_date', { withTimezone: true }).notNull(),
  notes: text('notes'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const meetingAttendance = pgTable('meeting_attendance', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id')
    .notNull()
    .references(() => meetings.id, { onDelete: 'cascade' }),
  organizationName: text('organization_name')
    .notNull()
    .references(() => organizations.organizationName, { onDelete: 'cascade' }),
  attended: boolean('attended').default(false).notNull(),
  notes: text('notes'),
  recordedBy: text('recorded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const orgHealthMetrics = pgTable('org_health_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationName: text('organization_name')
    .notNull()
    .references(() => organizations.organizationName, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  month: integer('month'), // null = annual snapshot
  memberCount: integer('member_count'),
  meetingsAttended: integer('meetings_attended'),
  totalMeetings: integer('total_meetings'),
  duesPaid: boolean('dues_paid'),
  engagementScore: integer('engagement_score'), // 0-100
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  emailOnApproval: boolean('email_on_approval').default(true).notNull(),
  emailOnNewResource: boolean('email_on_new_resource').default(true).notNull(),
  emailOnMeetingReminder: boolean('email_on_meeting_reminder').default(true).notNull(),
  emailOnDuesReminder: boolean('email_on_dues_reminder').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// BetterAuth Required Tables
// ============================================

// Sessions table - BetterAuth format
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  impersonatedBy: text('impersonated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Accounts table - BetterAuth format
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'), // For credential accounts
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Verification table - BetterAuth format (replaces verification_tokens)
export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ============================================
// Relations
// ============================================

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationName],
    references: [organizations.organizationName],
  }),
  accounts: many(accounts),
  sessions: many(sessions),
  receivedNotifications: many(approvalNotifications),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  resources: many(resources),
  domainWhitelist: many(organizationDomainWhitelist),
  duesRecords: many(duesRecords),
  meetingAttendance: many(meetingAttendance),
  healthMetrics: many(orgHealthMetrics),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  organizationRef: one(organizations, {
    fields: [resources.organization],
    references: [organizations.organizationName],
  }),
  files: many(resourceFiles),
  versions: many(resourceVersions),
}));

export const resourceFilesRelations = relations(resourceFiles, ({ one }) => ({
  resource: one(resources, {
    fields: [resourceFiles.resourceId],
    references: [resources.id],
  }),
}));

export const resourceVersionsRelations = relations(resourceVersions, ({ one }) => ({
  resource: one(resources, {
    fields: [resourceVersions.resourceId],
    references: [resources.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const organizationDomainWhitelistRelations = relations(organizationDomainWhitelist, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationDomainWhitelist.organizationName],
    references: [organizations.organizationName],
  }),
  createdByUser: one(users, {
    fields: [organizationDomainWhitelist.createdBy],
    references: [users.id],
  }),
}));

export const approvalNotificationsRelations = relations(approvalNotifications, ({ one }) => ({
  user: one(users, {
    fields: [approvalNotifications.userId],
    references: [users.id],
    relationName: 'notificationSubject',
  }),
  recipient: one(users, {
    fields: [approvalNotifications.recipientId],
    references: [users.id],
    relationName: 'notificationRecipient',
  }),
}));

export const duesRecordsRelations = relations(duesRecords, ({ one }) => ({
  organization: one(organizations, {
    fields: [duesRecords.organizationName],
    references: [organizations.organizationName],
  }),
}));

export const meetingsRelations = relations(meetings, ({ many }) => ({
  attendance: many(meetingAttendance),
}));

export const meetingAttendanceRelations = relations(meetingAttendance, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingAttendance.meetingId],
    references: [meetings.id],
  }),
  organization: one(organizations, {
    fields: [meetingAttendance.organizationName],
    references: [organizations.organizationName],
  }),
}));

export const orgHealthMetricsRelations = relations(orgHealthMetrics, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgHealthMetrics.organizationName],
    references: [organizations.organizationName],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

// ============================================
// Type Exports
// ============================================

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;

export type ResourceFile = typeof resourceFiles.$inferSelect;
export type NewResourceFile = typeof resourceFiles.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type ResourceVersion = typeof resourceVersions.$inferSelect;
export type NewResourceVersion = typeof resourceVersions.$inferInsert;

export type OrganizationDomainWhitelist = typeof organizationDomainWhitelist.$inferSelect;
export type NewOrganizationDomainWhitelist = typeof organizationDomainWhitelist.$inferInsert;

export type ApprovalNotification = typeof approvalNotifications.$inferSelect;
export type NewApprovalNotification = typeof approvalNotifications.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type DuesRecord = typeof duesRecords.$inferSelect;
export type NewDuesRecord = typeof duesRecords.$inferInsert;

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;

export type MeetingAttendance = typeof meetingAttendance.$inferSelect;
export type NewMeetingAttendance = typeof meetingAttendance.$inferInsert;

export type OrgHealthMetric = typeof orgHealthMetrics.$inferSelect;
export type NewOrgHealthMetric = typeof orgHealthMetrics.$inferInsert;

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;
