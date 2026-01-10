import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// Enums
// ============================================

export const resourceTypeEnum = pgEnum('resource_type', [
  'Policy',
  'Procedure',
  'Document',
  'Vendor',
]);

export const auditActionEnum = pgEnum('audit_action', [
  'created',
  'updated',
  'deleted',
  'downloaded',
  'viewed',
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Will match Auth.js user ID
  email: text('email').notNull().unique(),
  name: text('name'),
  password: text('password'), // Hashed password for credentials auth
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  organizationName: text('organization_name').references(
    () => organizations.organizationName
  ),
  isAdmin: boolean('is_admin').default(false).notNull(),
  // Approval workflow fields
  approvalStatus: approvalStatusEnum('approval_status').default('pending').notNull(),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  // OTP verification fields
  otpCode: text('otp_code'), // Hashed OTP code
  otpExpiresAt: timestamp('otp_expires_at', { withTimezone: true }),
  otpAttempts: integer('otp_attempts').default(0).notNull(),
  otpLastRequestedAt: timestamp('otp_last_requested_at', { withTimezone: true }),
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

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
  userId: uuid('user_id').notNull(),
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
  updatedByUserId: uuid('updated_by_user_id').notNull(),
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
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Approval notifications for admins
export const approvalNotifications = pgTable('approval_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  recipientId: uuid('recipient_id')
    .notNull()
    .references(() => users.id),
  type: text('type').notNull(), // 'pending_approval', 'approved', 'rejected'
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================
// Auth.js Required Tables
// ============================================

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

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
  approvedByUser: one(users, {
    fields: [users.approvedBy],
    references: [users.id],
  }),
  receivedNotifications: many(approvalNotifications),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  resources: many(resources),
  domainWhitelist: many(organizationDomainWhitelist),
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

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
