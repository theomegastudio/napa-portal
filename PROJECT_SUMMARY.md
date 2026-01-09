# NAPA Resource Hub - Project Summary

## Executive Overview

The NAPA Resource Hub is a multi-tenant SaaS platform built for the National APIDA Panhellenic Association network. It enables organizations to securely manage and share resources (policies, procedures, documents, and vendor information) with role-based access control, file management, and comprehensive audit logging.

**Current Status:** Feature-complete and ready for QA testing and deployment review

**Next Phase:** Migration from Supabase to PostgreSQL + Drizzle ORM + Row-Level Security after full deployment

---

## Table of Contents
- [Tech Stack](#tech-stack)
- [Complete Feature List](#complete-feature-list)
- [Development Timeline](#development-timeline)
- [Architecture Overview](#architecture-overview)
- [File Structure Analysis](#file-structure-analysis)
- [Security Implementation](#security-implementation)
- [Testing Checklist for QA](#testing-checklist-for-qa)
- [Known Considerations](#known-considerations)
- [Migration Plan](#migration-plan)

---

## Tech Stack

### Current Stack
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript 5
- **Styling:** Tailwind CSS 3.4.19, shadcn/ui components
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Authentication:** Supabase Auth (Magic Links/Passwordless)
- **Database:** Supabase PostgreSQL with Row-Level Security
- **Storage:** Supabase Storage (public bucket)
- **Notifications:** Sonner (toast notifications)
- **Icons:** Lucide React

### Planned Migration
- **Database:** PostgreSQL (self-hosted or managed)
- **ORM:** Drizzle ORM
- **Security:** Row-Level Security (RLS) policies
- **Authentication:** TBD (Auth.js, Clerk, or custom)
- **Storage:** TBD (AWS S3, Cloudflare R2, or similar)

---

## Complete Feature List

### 1. Authentication & Authorization ✅
- **Passwordless Magic Link Authentication**
  - Email-based login/signup
  - No passwords to manage
  - Secure OTP flow via Supabase Auth

- **User Roles**
  - Regular User: Upload and view organization resources
  - Organization Admin: Invite members, assign admin roles
  - NAPA Super Admin: Full system access across all organizations

- **NAPA Domain Auto-Admin**
  - @napahq.org and @napa-online.org emails automatically get super admin
  - Auto-assigned to "National APIDA Panhellenic Association"

- **Organization Onboarding**
  - New users select organization during signup
  - Required before dashboard access
  - Pre-filled for NAPA email domains

### 2. Resource Management ✅
- **CRUD Operations**
  - Create resources with multiple file uploads
  - Edit title, description, type, external links
  - Soft delete (preserves audit trail)
  - Restore deleted resources

- **Resource Types**
  - Policy
  - Procedure
  - Document
  - Vendor

- **File Management**
  - Multiple files per resource
  - Add/remove files after creation
  - File type validation (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images)
  - 10MB file size limit
  - Automatic filename sanitization
  - Magic byte validation (server-side security)

- **Search & Filtering**
  - Full-text search on title and description
  - Filter by resource type
  - Debounced search (500ms)
  - Organization-scoped results

### 3. Version History & Audit Logging ✅
- **Resource Versioning**
  - Track all changes to resources
  - Record what changed, who changed it, when
  - Version history view in resource details
  - Rollback capability (view previous versions)

- **Audit Trail**
  - Complete activity log per resource
  - Track: Create, Edit, Delete, Restore, File Add/Remove
  - User attribution for all actions
  - Timestamp precision
  - Stored in `audit_logs` table

### 4. Member Management ✅
- **Organization Admin Features**
  - View all organization members
  - Invite new members via magic link
  - Assign/revoke admin roles
  - Member list with role badges

- **NAPA Super Admin Features**
  - View all users across all organizations
  - Edit any user's organization
  - Change admin status
  - Delete users

### 5. UI/UX Features ✅
- **Resource Cards**
  - Clickable card opens detail dialog
  - Greek letter organization nicknames
  - Resource type badges with icons
  - File count indicators
  - Uploader information
  - Edit/Delete actions (permission-based)

- **Resource Detail Dialog**
  - Full resource information view
  - File list with download links
  - Version history tab
  - Edit inline capability
  - Responsive design

- **File Upload Dialog**
  - Drag-and-drop support
  - Multiple file selection
  - Real-time validation feedback
  - Error display for invalid files
  - Progress indication

- **Search & Filter Bar**
  - Search input with debouncing
  - Resource type filter dropdown
  - Clear filters button
  - Responsive layout

### 6. Security Implementation ✅
- **File Upload Security** (See SECURITY.md)
  - Client-side validation (UX)
  - Server-side validation (security)
  - Magic byte verification (prevents spoofing)
  - MIME type checking
  - File extension allowlist
  - Filename sanitization
  - Executable file blocking

- **Row-Level Security (RLS)**
  - Organization-based data isolation
  - Users can only see their org's resources
  - Admin privilege checks
  - Secure session management

- **Authentication Security**
  - Magic link expiration
  - PKCE flow for OAuth
  - Secure cookie handling
  - Session refresh middleware

### 7. Organization Features ✅
- **Greek Letter Nicknames**
  - Alpha Kappa Delta Phi → ΑΚΔΦαΚΔΦ
  - Lambda Theta Alpha → ΛΘΑλθα
  - Sigma Psi Zeta → ΣΨΖσψζ
  - (and 17 more organizations)

- **Multi-Tenant Architecture**
  - Complete data isolation per organization
  - Shared infrastructure
  - Organization-scoped queries
  - Cross-org admin access for NAPA

---

## Development Timeline

### Phase 1: Foundation (Commits 1-10)
**Initial commit → Clean up modal backgrounds**

**Key Milestones:**
- ✅ Initial Next.js setup with TypeScript
- ✅ Supabase integration (Auth + Database + Storage)
- ✅ Basic authentication flow (login/signup)
- ✅ Resource CRUD operations
- ✅ File upload system
- ✅ Fixed PKCE authentication errors
- ✅ Added NAPA super admin permissions
- ✅ Modal UI improvements

**Commits:**
```
30b15df Initial commit: NAPA Resource Hub
1131dbd Fix build error: Replace FileStack with FileText icon
0eca1c0 Fix Suspense boundary error for useSearchParams
49a599a Improve modal UI design
9da440d Improve modal styling consistency
b384b8d Fix PKCE code verifier error by adding explicit cookie handlers
8f32b28 Add NAPA super admin permissions and improve button hover styling
8c35ff9 Fix PKCE authentication error by removing custom cookie handlers
eceeddc Improve Manage Members button styling and capitalize Make Admin
e5b3ba1 Clean up modal backgrounds and update placeholder text
```

### Phase 2: Documentation & Security (Commits 11-12)
**Add developer documentation → Add file security**

**Key Milestones:**
- ✅ Created comprehensive DEVELOPER_GUIDE.md
- ✅ Implemented file upload security system
- ✅ Added file validation utilities
- ✅ Created SECURITY.md documentation
- ✅ Magic byte validation
- ✅ MIME type verification

**Commits:**
```
ba302c9 Add comprehensive developer documentation
0611c62 Add comprehensive file upload security and update documentation
```

### Phase 3: Member Management & UI (Commits 13-15)
**Add member management → Remove dark mode**

**Key Milestones:**
- ✅ Organization member management
- ✅ Member invitation system
- ✅ Admin role assignment
- ✅ Dark mode toggle (later removed for consistency)
- ✅ Improved delete error handling

**Commits:**
```
020a9d8 Add organization member management and improve UI
e05e8fc Add dark mode toggle and theme switching
009a6fb Improve delete error handling with better messages
134b465 Remove dark mode feature and improve delete functionality
```

### Phase 4: Audit System & Versioning (Commits 16-19)
**Add audit logging → Fix TypeScript errors**

**Key Milestones:**
- ✅ Comprehensive audit logging system
- ✅ Resource version history tracking
- ✅ File change tracking
- ✅ Activity timeline view
- ✅ Added Alert UI component
- ✅ Fixed nullable file_name handling

**Commits:**
```
5e14add Add comprehensive audit logging system
f80448d Add comprehensive resource version history and file management
551c5b2 Add missing Alert component for build fix
02f1464 Fix TypeScript error: handle nullable file_name in conflict detection
```

### Phase 5: UI/UX Refinement (Commits 20-28)
**Improve resource cards → Display validation errors**

**Key Milestones:**
- ✅ Redesigned resource cards with clickable details
- ✅ Greek letter organization nicknames
- ✅ Resource detail dialog
- ✅ Improved card layout alignment
- ✅ File indicator with icons
- ✅ Server-side magic byte validation
- ✅ Client-side validation error display

**Commits:**
```
b747b60 Improve resource card UI layout and organization display
5f07bf0 Redesign resource cards with clickable detail view and Greek letter nicknames
729dbfd Update organization nicknames with correct Greek letters
9d71bd2 Improve resource detail dialog layout and styling
0c860b7 Improve resource detail dialog styling
fd66d0e Update ResourceDetailDialog.tsx
6f932d6 Improve UI/UX across resource cards and dialogs
ab6161c Align resource card content for uniform grid layout
e5345c7 Remove icon from resource card title and add to file indicator
534076c Add server-side magic byte validation for file uploads
21d9741 Display server-side validation errors in file upload dialogs
```

---

## Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Next.js Pages (App Router)                                 │
│  ├── /login          - Login page                           │
│  ├── /signup         - Signup with org selection            │
│  ├── /               - Main dashboard (protected)           │
│  ├── /admin/users    - User management (NAPA admin)         │
│  └── /auth/callback  - OAuth callback handler               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Component Layer                         │
├─────────────────────────────────────────────────────────────┤
│  ├── UploadResourceDialog    - Create resources             │
│  ├── EditResourceDialog       - Edit resources              │
│  ├── ResourceDetailDialog     - View resource details       │
│  ├── ResourceCard             - Display resource            │
│  ├── ManageMembers            - Org member management       │
│  ├── OrganizationSetup        - Onboarding                  │
│  └── ui/*                     - shadcn/ui components        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
├─────────────────────────────────────────────────────────────┤
│  lib/services/                                              │
│  ├── auth.ts          - Authentication operations           │
│  ├── resources.ts     - Resource CRUD                       │
│  ├── organizations.ts - Organization management             │
│  ├── storage.ts       - File upload/delete                  │
│  └── members.ts       - Member invitations                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Layer                          │
├─────────────────────────────────────────────────────────────┤
│  ├── Supabase Auth     - Magic link authentication          │
│  ├── PostgreSQL        - Database with RLS                  │
│  │   ├── users                                              │
│  │   ├── organizations                                      │
│  │   ├── resources                                          │
│  │   ├── resource_files                                     │
│  │   ├── audit_logs                                         │
│  │   └── resource_versions                                  │
│  └── Supabase Storage  - File storage (resource-files)      │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

```sql
-- Users table
users (
  id: UUID (FK to auth.users),
  email: TEXT,
  organization_name: TEXT,
  is_admin: BOOLEAN,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)

-- Organizations table
organizations (
  id: UUID,
  organization_name: TEXT UNIQUE,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)

-- Resources table
resources (
  id: UUID,
  title: TEXT,
  description: TEXT,
  resource_type: ENUM ('Policy', 'Procedure', 'Document', 'Vendor'),
  external_link: TEXT,
  organization: TEXT (FK to users.organization_name),
  uploaded_by: TEXT,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP,
  deleted_at: TIMESTAMP
)

-- Resource files table
resource_files (
  id: UUID,
  resource_id: UUID (FK to resources),
  file_url: TEXT,
  file_name: TEXT,
  created_at: TIMESTAMP
)

-- Audit logs table
audit_logs (
  id: UUID,
  resource_id: UUID (FK to resources),
  action: TEXT,
  user_email: TEXT,
  changes: JSONB,
  created_at: TIMESTAMP
)

-- Resource versions table
resource_versions (
  id: UUID,
  resource_id: UUID (FK to resources),
  version_number: INTEGER,
  title: TEXT,
  description: TEXT,
  resource_type: TEXT,
  external_link: TEXT,
  changed_by: TEXT,
  created_at: TIMESTAMP
)
```

---

## File Structure Analysis

### Current File Count: ~40 files

### Potential Consolidation Opportunities

#### 1. Dialog Components (3 files → Could consolidate)
```
components/UploadResourceDialog.tsx      (350 lines)
components/EditResourceDialog.tsx        (400 lines)
components/ResourceDetailDialog.tsx      (300 lines)
```
**Recommendation:** These share significant logic (file handling, validation, form management). Could create:
- `components/ResourceDialog.tsx` - Single dialog with modes: 'create' | 'edit' | 'view'
- **Pros:** Reduce duplication, easier maintenance
- **Cons:** More complex component, harder to understand
- **Verdict:** Keep separate for clarity (feature-complete, no active changes expected)

#### 2. Service Layer (5 files → Well organized)
```
lib/services/auth.ts              (200 lines)
lib/services/resources.ts         (300 lines)
lib/services/organizations.ts     (100 lines)
lib/services/storage.ts           (150 lines)
lib/services/members.ts           (100 lines)
```
**Recommendation:** Keep as-is. Well-separated concerns, good SRP (Single Responsibility Principle)

#### 3. Supabase Clients (3 files → Necessary)
```
lib/supabase/client.ts            (20 lines)
lib/supabase/server.ts            (30 lines)
lib/supabase/middleware.ts        (40 lines)
```
**Recommendation:** Keep separate. Next.js requires different client instances for browser vs server.

#### 4. UI Components (20+ shadcn files → Library files)
```
components/ui/button.tsx
components/ui/card.tsx
components/ui/dialog.tsx
... (17 more)
```
**Recommendation:** Keep as-is. These are library components from shadcn/ui, standard practice.

#### 5. Logo Components (3 files → Could consolidate)
```
components/NapaLogo.tsx           (30 lines)
components/NapaAuthLogo.tsx       (30 lines)
components/NapaPortalLogo.tsx     (30 lines)
```
**Recommendation:** Could create `components/Logo.tsx` with variant prop
- **Potential consolidation:** `<Logo variant="default" | "auth" | "portal" />`
- **Impact:** Save ~60 lines, slight complexity increase
- **Priority:** Low (cosmetic improvement)

### File Structure Health: ✅ Good
- Clear separation of concerns
- Logical folder organization
- Minimal duplication
- Well-typed with TypeScript
- Documented with comprehensive guides

---

## Security Implementation

### File Upload Security (Comprehensive)

**Location:** `lib/utils/file-validation.ts`, `docs/SECURITY.md`

#### Client-Side Validation
```typescript
✅ File size limit (10MB)
✅ File extension check
✅ MIME type verification
✅ Executable file blocking
✅ Filename sanitization
✅ Real-time error feedback
```

#### Server-Side Validation (Defense in depth)
```typescript
✅ Magic byte validation (reads file header)
✅ MIME type re-verification
✅ Extension re-check
✅ Size limit enforcement
✅ Filename sanitization
✅ Error reporting to client
```

**Blocked File Types:**
`.exe`, `.dmg`, `.bat`, `.sh`, `.cmd`, `.dll`, `.app`, `.pkg`, `.msi`, `.scr`, `.vbs`, `.jar`, `.com`, `.pif`, `.cpl`, `.msc`, `.hta`, `.deb`, `.rpm`

**Allowed File Types:**
- Documents: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX
- Images: PNG, JPG, JPEG, GIF

### Row-Level Security (RLS)

**Implemented via Supabase:**
- Users can only SELECT/INSERT/UPDATE/DELETE resources from their organization
- NAPA super admins bypass RLS for management operations
- Audit logs are append-only (no UPDATE/DELETE)
- Organization table is read-only for users

### Authentication Security

```
✅ Passwordless (no password breach risk)
✅ Magic link expiration (Supabase default: 1 hour)
✅ PKCE flow for OAuth
✅ Secure cookie handling (httpOnly, secure, sameSite)
✅ Session refresh middleware
✅ Protected routes with auth checks
```

---

## Testing Checklist for QA

### Authentication Flow
- [ ] Login with existing user email
- [ ] Login with non-existent email (should redirect to signup)
- [ ] Signup with new email and organization selection
- [ ] Signup with @napahq.org email (should auto-select NAPA org and grant admin)
- [ ] Signup with @napa-online.org email (same as above)
- [ ] Magic link expiration handling
- [ ] Logout functionality
- [ ] Session persistence across page refreshes
- [ ] Session expiration after timeout

### Resource Management
- [ ] Create resource with no files
- [ ] Create resource with 1 file
- [ ] Create resource with multiple files (3-5)
- [ ] Create resource with external link only
- [ ] Edit resource title/description
- [ ] Edit resource type
- [ ] Add files to existing resource
- [ ] Remove files from resource
- [ ] Delete resource (soft delete)
- [ ] Verify deleted resource is hidden from main view
- [ ] Search resources by title
- [ ] Search resources by description
- [ ] Filter resources by type (Policy, Procedure, Document, Vendor)
- [ ] Clear filters
- [ ] Download files from resource card
- [ ] Open resource detail dialog
- [ ] View version history in detail dialog

### File Upload Security
- [ ] Upload valid PDF file
- [ ] Upload valid DOCX file
- [ ] Upload valid XLSX file
- [ ] Upload valid PPTX file
- [ ] Upload valid PNG/JPG image
- [ ] Try uploading .exe file (should fail with error)
- [ ] Try uploading .sh file (should fail)
- [ ] Try uploading .bat file (should fail)
- [ ] Try uploading file over 10MB (should fail)
- [ ] Try uploading file with special characters in name (should sanitize)
- [ ] Try uploading .exe renamed to .pdf (should fail magic byte check)
- [ ] Upload multiple files at once (mix of valid types)
- [ ] Verify error messages are clear and helpful

### Permissions & Authorization
- [ ] Regular user can only edit/delete their own resources
- [ ] Regular user cannot edit/delete other users' resources
- [ ] Org admin can invite members
- [ ] Org admin can assign admin role to members
- [ ] Org admin can remove admin role from members
- [ ] Org admin can view all org members
- [ ] NAPA super admin can edit any resource
- [ ] NAPA super admin can delete any resource
- [ ] NAPA super admin can access /admin/users page
- [ ] Regular user cannot access /admin/users (should redirect)
- [ ] Org admin (non-NAPA) cannot access /admin/users
- [ ] NAPA admin can edit any user's organization
- [ ] NAPA admin can change any user's admin status
- [ ] NAPA admin can delete users

### Member Management
- [ ] Org admin opens "Manage Members" dialog
- [ ] View list of current organization members
- [ ] Invite new member with valid email
- [ ] Verify invitation email is sent (check magic link)
- [ ] New member signs up via invitation link
- [ ] Assign admin role to member
- [ ] Remove admin role from member
- [ ] Verify admin badge shows correctly
- [ ] Try inviting member to different organization (should fail)

### Audit Logging & Versioning
- [ ] Create resource, verify audit log entry
- [ ] Edit resource, verify audit log shows changes
- [ ] Delete resource, verify audit log entry
- [ ] Add file to resource, verify audit log
- [ ] Remove file from resource, verify audit log
- [ ] View version history in resource detail
- [ ] Verify version history shows all changes
- [ ] Verify version history shows correct user attribution
- [ ] Verify version history timestamps are accurate

### UI/UX Testing
- [ ] Resource cards display correctly on desktop
- [ ] Resource cards display correctly on mobile
- [ ] Resource cards display correctly on tablet
- [ ] Greek letter nicknames display correctly
- [ ] Resource type badges show correct icons
- [ ] File count indicator is accurate
- [ ] Search input debouncing works (no spam)
- [ ] Toast notifications appear for success/error
- [ ] Loading states show during async operations
- [ ] Empty states show when no resources
- [ ] Dialogs close properly
- [ ] Forms validate input
- [ ] Buttons have hover states
- [ ] All text is readable and properly sized

### Cross-Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

### Performance Testing
- [ ] Dashboard loads in < 2 seconds with 50 resources
- [ ] Search responds instantly (debounced)
- [ ] File uploads show progress
- [ ] No console errors in browser
- [ ] No memory leaks during extended use
- [ ] Image optimization (if applicable)

### Edge Cases
- [ ] Try uploading 10+ files at once
- [ ] Try uploading same file twice to same resource
- [ ] Try editing resource while offline (should show error)
- [ ] Try deleting resource twice (should handle gracefully)
- [ ] Try accessing protected routes without auth (should redirect)
- [ ] Try SQL injection in search input (should sanitize)
- [ ] Try XSS in resource title/description (should sanitize)
- [ ] Try very long resource titles (should truncate or wrap)
- [ ] Try very long file names (should sanitize)

---

## Known Considerations

### Current Limitations

1. **No Email Service**
   - Magic links sent via Supabase (free tier limits apply)
   - Consider Resend, SendGrid, or AWS SES for production

2. **No Rate Limiting**
   - File uploads not rate-limited
   - Could abuse upload endpoint
   - Recommendation: Add rate limiting middleware (Upstash, Vercel Edge)

3. **No Pagination**
   - All resources loaded at once
   - Could be slow with 1000+ resources
   - Recommendation: Add virtual scrolling or pagination

4. **No Bulk Operations**
   - Can't delete multiple resources at once
   - Can't move resources between orgs
   - Low priority feature

5. **No Advanced Search**
   - No search by uploader, date range, or file type
   - No saved searches
   - Future enhancement

6. **No Export Functionality**
   - Can't export resource list to CSV/Excel
   - Can't generate reports
   - Future enhancement

7. **No File Versioning**
   - Replacing files doesn't keep old versions
   - Only resource metadata is versioned
   - Consider adding file versioning in v2

### Technical Debt

1. **Dark Mode Feature Removed**
   - Added in commit e05e8fc, removed in 134b465
   - Reason: Inconsistent theming across shadcn components
   - Could re-add with proper theme configuration

2. **PKCE Cookie Handling**
   - Added custom handlers (b384b8d), then removed (8c35ff9)
   - Settled on Supabase default cookie handling
   - No action needed

3. **FileStack Icon → FileText**
   - Initial icon didn't exist in Lucide
   - Fixed in second commit
   - No action needed

### Security Considerations

1. **Supabase Anon Key in Client**
   - Public anon key exposed in browser (standard practice)
   - RLS policies protect data access
   - No action needed (Supabase design pattern)

2. **Public Storage Bucket**
   - All uploaded files are publicly accessible via URL
   - Consider: Private bucket with signed URLs for sensitive documents
   - Current: Acceptable for non-confidential organizational resources

3. **Magic Link Security**
   - Links expire after 1 hour (Supabase default)
   - Single-use tokens
   - Consider: Add IP validation or device fingerprinting for high-security orgs

---

## Migration Plan

### Current: Supabase Stack
```
- Supabase Auth (magic links)
- Supabase PostgreSQL (database)
- Supabase Storage (file storage)
- Supabase RLS (row-level security)
```

### Target: Self-Hosted Stack

#### Phase 1: Database Migration
**Goal:** Move from Supabase PostgreSQL to self-hosted PostgreSQL with Drizzle ORM

**Steps:**
1. **Set up PostgreSQL**
   - Choose provider: Neon, Supabase (database only), RDS, Railway, or self-hosted
   - Configure connection string
   - Set up connection pooling (PgBouncer recommended)

2. **Install Drizzle ORM**
   ```bash
   npm install drizzle-orm
   npm install -D drizzle-kit
   npm install pg
   npm install -D @types/pg
   ```

3. **Define Drizzle Schema**
   ```typescript
   // lib/db/schema.ts
   import { pgTable, uuid, text, timestamp, boolean, integer, jsonb } from 'drizzle-orm/pg-core';

   export const users = pgTable('users', {
     id: uuid('id').primaryKey(),
     email: text('email').notNull().unique(),
     organizationName: text('organization_name'),
     isAdmin: boolean('is_admin').default(false),
     createdAt: timestamp('created_at').defaultNow(),
     updatedAt: timestamp('updated_at').defaultNow(),
   });

   export const resources = pgTable('resources', {
     id: uuid('id').primaryKey().defaultRandom(),
     title: text('title').notNull(),
     description: text('description'),
     resourceType: text('resource_type'),
     externalLink: text('external_link'),
     organization: text('organization'),
     uploadedBy: text('uploaded_by').notNull(),
     createdAt: timestamp('created_at').defaultNow(),
     updatedAt: timestamp('updated_at').defaultNow(),
     deletedAt: timestamp('deleted_at'),
   });

   // ... other tables
   ```

4. **Migrate Data**
   ```bash
   # Export from Supabase
   pg_dump $SUPABASE_DB_URL > backup.sql

   # Import to new PostgreSQL
   psql $NEW_DB_URL < backup.sql
   ```

5. **Update Service Layer**
   - Replace Supabase client calls with Drizzle queries
   - Example migration:
   ```typescript
   // Before (Supabase)
   const { data } = await supabase
     .from('resources')
     .select('*')
     .eq('organization', orgName);

   // After (Drizzle)
   const data = await db
     .select()
     .from(resources)
     .where(eq(resources.organization, orgName));
   ```

6. **Implement RLS**
   - Option A: Database-level RLS policies (PostgreSQL native)
   - Option B: Application-level RLS (middleware/service layer)
   - Recommendation: Database-level for security

**Estimated Time:** 2-3 weeks

#### Phase 2: Authentication Migration
**Goal:** Move from Supabase Auth to alternative

**Options:**

**Option A: Auth.js (formerly NextAuth)**
```typescript
// Pros:
// - Open source, self-hosted
// - Built for Next.js
// - Supports magic links
// - Large community

// Cons:
// - More setup required
// - Need email service (Resend, SendGrid)

// Implementation:
npm install next-auth
npm install @auth/drizzle-adapter
```

**Option B: Clerk**
```typescript
// Pros:
// - Drop-in replacement
// - Beautiful UI components
// - Magic link support
// - Good DX

// Cons:
// - Paid service (free tier available)
// - Vendor lock-in
// - Less customizable

// Implementation:
npm install @clerk/nextjs
```

**Option C: Custom Auth + Lucia**
```typescript
// Pros:
// - Full control
// - Lightweight
// - No vendor lock-in

// Cons:
// - More work
// - Need to handle edge cases
// - Security responsibility

// Implementation:
npm install lucia
npm install @lucia-auth/adapter-postgresql
```

**Recommendation:** Auth.js (Option A) for balance of control and features

**Estimated Time:** 1-2 weeks

#### Phase 3: Storage Migration
**Goal:** Move from Supabase Storage to alternative

**Options:**

**Option A: AWS S3**
```typescript
// Pros: Industry standard, reliable, cheap
// Cons: AWS complexity, IAM setup

npm install @aws-sdk/client-s3
npm install @aws-sdk/s3-request-presigner
```

**Option B: Cloudflare R2**
```typescript
// Pros: S3-compatible API, zero egress fees, simple
// Cons: Newer service

// Same SDK as S3
npm install @aws-sdk/client-s3
```

**Option C: UploadThing**
```typescript
// Pros: Built for Next.js, simple API, good DX
// Cons: Paid service, vendor lock-in

npm install uploadthing
```

**Recommendation:** Cloudflare R2 (Option B) for cost-effectiveness

**Service Layer Updates:**
```typescript
// lib/services/storage.ts (new implementation)
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const filename = generateUniqueFilename(file.name);

  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: filename,
    Body: Buffer.from(buffer),
    ContentType: file.type,
  }));

  return `${process.env.R2_PUBLIC_URL}/${filename}`;
}
```

**Estimated Time:** 1 week

#### Phase 4: Testing & Deployment
**Goal:** Verify all functionality works with new stack

**Steps:**
1. Set up staging environment with new stack
2. Run full QA test suite (see above)
3. Load test with realistic data volumes
4. Security audit (RLS policies, auth flow)
5. Performance benchmarks
6. Gradual rollout (beta users → full migration)

**Estimated Time:** 2-3 weeks

### Total Migration Timeline: 6-9 weeks

### Migration Risks

| Risk | Mitigation |
|------|------------|
| Data loss during migration | Full backup before migration, test restore process |
| Downtime during cutover | Blue-green deployment, DNS switch |
| Auth session invalidation | Communicate downtime, re-login required |
| File URLs breaking | Redirect old URLs to new storage, or migrate files first |
| RLS policy bugs | Comprehensive testing, gradual rollout |
| Performance regression | Benchmark before/after, optimize queries |

### Cost Comparison

**Current (Supabase Free Tier):**
- Database: Free (500MB, 2GB bandwidth)
- Auth: Free (50,000 MAU)
- Storage: Free (1GB, 2GB bandwidth)
- **Total: $0/month** (within limits)

**After Migration (Estimated):**
- Database: Neon Free Tier ($0) or Railway ($5/month)
- Auth: Auth.js + Resend ($0 for 3,000 emails/month)
- Storage: Cloudflare R2 ($0.015/GB stored, $0 egress)
- **Total: $5-10/month** (low volume) to **$50-100/month** (high volume)

**Note:** Supabase Pro is $25/month if staying on Supabase for all services

---

## Recommendations for Dev Team

### Before Migration

1. **Complete QA Testing**
   - Run through entire testing checklist
   - Document any bugs found
   - Fix critical bugs before migration

2. **Performance Baseline**
   - Measure current load times
   - Measure query performance
   - Document for comparison after migration

3. **Backup Strategy**
   - Export all data from Supabase (SQL dump)
   - Download all files from storage
   - Export user list with emails

4. **File Consolidation Review**
   - Review logo components (3 files → 1 file)
   - Consider resource dialog consolidation (decide based on maintenance burden)
   - Document decision in code comments

### During Migration

1. **Incremental Approach**
   - Migrate database first, keep Supabase Auth temporarily
   - Then migrate Auth
   - Finally migrate Storage
   - Don't do all at once

2. **Feature Flags**
   - Use environment variables to toggle between old/new implementations
   - Example: `USE_DRIZZLE=true` vs Supabase queries
   - Allows quick rollback if issues

3. **Monitoring**
   - Set up error tracking (Sentry, LogRocket)
   - Monitor query performance (Drizzle logging)
   - Track user sessions and auth flows

### After Migration

1. **Performance Audit**
   - Compare against baseline
   - Optimize slow queries
   - Add indexes if needed

2. **Security Audit**
   - Verify RLS policies work correctly
   - Test unauthorized access attempts
   - Check for SQL injection vulnerabilities

3. **Documentation Update**
   - Update DEVELOPER_GUIDE.md with new stack
   - Document new environment variables
   - Update setup instructions

4. **Cost Monitoring**
   - Track database usage
   - Track storage costs
   - Track email sending costs
   - Set up billing alerts

---

## Files for Dev Team Review

### Priority 1: Core Logic
- [ ] `lib/services/auth.ts` - Authentication logic
- [ ] `lib/services/resources.ts` - Resource CRUD
- [ ] `lib/services/storage.ts` - File uploads
- [ ] `lib/utils/file-validation.ts` - Security validation

### Priority 2: UI Components
- [ ] `components/UploadResourceDialog.tsx` - File upload UI
- [ ] `components/EditResourceDialog.tsx` - Edit form
- [ ] `components/ResourceCard.tsx` - Card display
- [ ] `components/ResourceDetailDialog.tsx` - Detail view

### Priority 3: Configuration
- [ ] `middleware.ts` - Session management
- [ ] `lib/supabase/server.ts` - Server client
- [ ] `lib/supabase/client.ts` - Browser client

### Priority 4: Documentation
- [ ] `DEVELOPER_GUIDE.md` - Developer onboarding
- [ ] `docs/SECURITY.md` - Security implementation
- [ ] `PROJECT_SUMMARY.md` - This file

---

## Next Steps

### Immediate (This Week)
1. ✅ Complete PROJECT_SUMMARY.md (this document)
2. [ ] QA team reviews testing checklist
3. [ ] Dev team reviews file consolidation recommendations
4. [ ] Schedule migration planning meeting

### Short-term (Next 2 Weeks)
1. [ ] Complete full QA testing
2. [ ] Document bugs and create GitHub issues
3. [ ] Fix critical bugs
4. [ ] Finalize migration stack decisions (Auth.js vs Clerk, R2 vs S3)

### Mid-term (Next 4-6 Weeks)
1. [ ] Set up staging environment for migration
2. [ ] Begin Phase 1: Database migration to PostgreSQL + Drizzle
3. [ ] Test database migration thoroughly

### Long-term (Next 2-3 Months)
1. [ ] Complete full migration (Auth + Storage)
2. [ ] Performance audit and optimization
3. [ ] Production deployment
4. [ ] Post-launch monitoring

---

## Contact & Support

For questions about this project:
- **Technical Lead:** [Your Name]
- **Repository:** [GitHub URL]
- **Documentation:** See `DEVELOPER_GUIDE.md`
- **Security:** See `docs/SECURITY.md`

---

**Document Version:** 1.0
**Last Updated:** December 18, 2024
**Author:** AI Assistant + Development Team
**Status:** Ready for QA and Migration Planning
