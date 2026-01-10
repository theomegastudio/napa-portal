# NAPA Resource Hub - Migration Plan

## Migration: Supabase → PostgreSQL + Drizzle ORM + Auth.js

**Target Architecture:**
- **Database:** Self-hosted PostgreSQL with Row-Level Security (RLS)
- **ORM:** Drizzle ORM
- **Authentication:** Auth.js (NextAuth v5) with Magic Links
- **Storage:** TBD (Cloudflare R2 or MinIO recommended)

---

## Phase 1: Database Setup & Drizzle ORM

### 1.1 Install Dependencies

```bash
# Drizzle ORM and PostgreSQL driver
npm install drizzle-orm pg
npm install -D drizzle-kit @types/pg

# For connection pooling (recommended for production)
npm install @neondatabase/serverless  # if using Neon
# OR
npm install pg-pool  # if self-hosting
```

### 1.2 Create Drizzle Schema

Create `lib/db/schema.ts`:

```typescript
import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const resourceTypeEnum = pgEnum('resource_type', ['Policy', 'Procedure', 'Document', 'Vendor']);
export const auditActionEnum = pgEnum('audit_action', ['created', 'updated', 'deleted', 'downloaded', 'viewed']);

// Organizations table
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationName: text('organization_name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Matches Auth.js user ID
  email: text('email').notNull().unique(),
  organizationName: text('organization_name').references(() => organizations.organizationName),
  isAdmin: boolean('is_admin').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Resources table
export const resources = pgTable('resources', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  resourceType: resourceTypeEnum('resource_type').notNull(),
  externalLink: text('external_link'),
  organization: text('organization').notNull().references(() => organizations.organizationName),
  uploadedBy: text('uploaded_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// Resource files table
export const resourceFiles = pgTable('resource_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  resourceId: uuid('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Resource versions table
export const resourceVersions = pgTable('resource_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  resourceId: uuid('resource_id').notNull().references(() => resources.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  resourceType: text('resource_type').notNull(),
  externalLink: text('external_link'),
  updatedBy: text('updated_by').notNull(),
  updatedByUserId: uuid('updated_by_user_id').notNull(),
  changeNotes: text('change_notes'),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationName],
    references: [organizations.organizationName],
  }),
}));

export const resourcesRelations = relations(resources, ({ many }) => ({
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
```

### 1.3 Create Drizzle Config

Create `drizzle.config.ts`:

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### 1.4 Create Database Client

Create `lib/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Connection pool size
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
```

### 1.5 Add npm Scripts

Update `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

---

## Phase 2: Row-Level Security (RLS)

### 2.1 RLS Implementation Strategy

We'll implement RLS at the application layer using Drizzle's query building capabilities, combined with PostgreSQL RLS policies for defense-in-depth.

### 2.2 Create RLS Policies SQL

Create `drizzle/rls-policies.sql`:

```sql
-- Enable RLS on all tables
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create app user role (used by the application)
CREATE ROLE app_user;

-- Resources: Users can only see resources from their organization
CREATE POLICY resources_org_isolation ON resources
  FOR ALL
  USING (
    organization = current_setting('app.current_organization', true)
    OR current_setting('app.is_napa_admin', true)::boolean = true
  );

-- Resource files: Inherit from parent resource
CREATE POLICY resource_files_org_isolation ON resource_files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM resources r
      WHERE r.id = resource_files.resource_id
      AND (
        r.organization = current_setting('app.current_organization', true)
        OR current_setting('app.is_napa_admin', true)::boolean = true
      )
    )
  );

-- Audit logs: Users can only see their organization's logs
CREATE POLICY audit_logs_org_isolation ON audit_logs
  FOR SELECT
  USING (
    organization = current_setting('app.current_organization', true)
    OR current_setting('app.is_napa_admin', true)::boolean = true
  );

-- Audit logs: Anyone can insert (for logging)
CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Users: Users can see members of their organization
CREATE POLICY users_org_isolation ON users
  FOR SELECT
  USING (
    organization_name = current_setting('app.current_organization', true)
    OR current_setting('app.is_napa_admin', true)::boolean = true
  );

-- Grant permissions to app_user
GRANT SELECT, INSERT, UPDATE, DELETE ON resources TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON resource_files TO app_user;
GRANT SELECT, INSERT ON audit_logs TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON resource_versions TO app_user;
GRANT SELECT, UPDATE ON users TO app_user;
GRANT SELECT ON organizations TO app_user;
```

### 2.3 Create RLS Context Middleware

Create `lib/db/rls-context.ts`:

```typescript
import { db } from './index';
import { sql } from 'drizzle-orm';

export async function setRLSContext(
  organization: string | null,
  isNapaAdmin: boolean
) {
  await db.execute(sql`
    SET LOCAL app.current_organization = ${organization ?? ''};
    SET LOCAL app.is_napa_admin = ${isNapaAdmin};
  `);
}

export async function withRLSContext<T>(
  organization: string | null,
  isNapaAdmin: boolean,
  callback: () => Promise<T>
): Promise<T> {
  await setRLSContext(organization, isNapaAdmin);
  return callback();
}
```

---

## Phase 3: Auth.js Integration

### 3.1 Install Auth.js Dependencies

```bash
npm install next-auth@beta @auth/drizzle-adapter
npm install nodemailer  # For magic link emails
npm install -D @types/nodemailer
```

### 3.2 Create Auth.js Schema Extensions

Add to `lib/db/schema.ts`:

```typescript
import { primaryKey } from 'drizzle-orm/pg-core';

// Auth.js required tables
export const accounts = pgTable('accounts', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: integer('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
}, (account) => ({
  pk: primaryKey({ columns: [account.provider, account.providerAccountId] }),
}));

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull(),
  expires: timestamp('expires').notNull(),
}, (vt) => ({
  pk: primaryKey({ columns: [vt.identifier, vt.token] }),
}));
```

### 3.3 Create Auth.js Configuration

Create `lib/auth.ts`:

```typescript
import NextAuth from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from './db';
import * as schema from './db/schema';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      sendVerificationRequest: async ({ identifier: email, url }) => {
        await transporter.sendMail({
          to: email,
          from: process.env.EMAIL_FROM,
          subject: 'Sign in to NAPA Resource Hub',
          text: `Click here to sign in: ${url}`,
          html: `
            <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
              <h2>Sign in to NAPA Resource Hub</h2>
              <p>Click the button below to sign in:</p>
              <a href="${url}" style="display: inline-block; background: #EAB308; color: black; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Sign In
              </a>
              <p style="color: #666; font-size: 14px; margin-top: 24px;">
                If you didn't request this email, you can safely ignore it.
              </p>
            </div>
          `,
        });
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Add user info to session
      if (session.user) {
        session.user.id = user.id;

        // Fetch additional user data
        const userData = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.id, user.id),
        });

        if (userData) {
          session.user.organizationName = userData.organizationName;
          session.user.isAdmin = userData.isAdmin;
          session.user.isNapaAdmin = userData.isAdmin &&
            userData.organizationName === 'National APIDA Panhellenic Association';
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      // Auto-assign NAPA org for NAPA email domains
      if (user.email) {
        const napaDomains = ['@napahq.org', '@napa-online.org'];
        const isNapaEmail = napaDomains.some(domain =>
          user.email!.toLowerCase().endsWith(domain)
        );

        if (isNapaEmail) {
          // Will be handled in the user creation callback
        }
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-assign NAPA org and admin for NAPA emails
      if (user.email) {
        const napaDomains = ['@napahq.org', '@napa-online.org'];
        const isNapaEmail = napaDomains.some(domain =>
          user.email!.toLowerCase().endsWith(domain)
        );

        if (isNapaEmail) {
          await db.update(schema.users)
            .set({
              organizationName: 'National APIDA Panhellenic Association',
              isAdmin: true,
            })
            .where(eq(schema.users.id, user.id));
        }
      }
    },
  },
  pages: {
    signIn: '/login',
    verifyRequest: '/login?verify=true',
    error: '/login?error=true',
  },
});
```

### 3.4 Create Auth API Routes

Create `app/api/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from '@/lib/auth';
export const { GET, POST } = handlers;
```

### 3.5 Create Auth Middleware

Update `middleware.ts`:

```typescript
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
                     req.nextUrl.pathname.startsWith('/signup');
  const isPublicPage = req.nextUrl.pathname === '/terms' ||
                       req.nextUrl.pathname === '/privacy';
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  const isAuthCallback = req.nextUrl.pathname.startsWith('/api/auth');

  // Allow auth callbacks
  if (isAuthCallback) {
    return NextResponse.next();
  }

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.nextUrl));
  }

  // Allow public pages
  if (isPublicPage) {
    return NextResponse.next();
  }

  // Protect all other routes
  if (!isLoggedIn && !isAuthPage && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

---

## Phase 4: Service Layer Migration

### 4.1 Migrate Resource Service

Create `lib/services/resources.new.ts`:

```typescript
import { db } from '@/lib/db';
import { resources, resourceFiles, auditLogs, resourceVersions } from '@/lib/db/schema';
import { eq, and, isNull, ilike, or, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function getResources(params?: {
  searchText?: string;
  resourceType?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  let query = db.query.resources.findMany({
    where: and(
      isNull(resources.deletedAt),
      // RLS: Filter by organization (unless NAPA admin)
      session.user.isNapaAdmin
        ? undefined
        : eq(resources.organization, session.user.organizationName!),
      // Search filter
      params?.searchText
        ? or(
            ilike(resources.title, `%${params.searchText}%`),
            ilike(resources.description, `%${params.searchText}%`)
          )
        : undefined,
      // Type filter
      params?.resourceType
        ? eq(resources.resourceType, params.resourceType as any)
        : undefined
    ),
    with: {
      files: true,
    },
    orderBy: desc(resources.createdAt),
  });

  return query;
}

export async function createResource(params: {
  title: string;
  description?: string;
  resourceType: string;
  externalLink?: string;
  files?: { url: string; name?: string }[];
}) {
  const session = await auth();
  if (!session?.user?.organizationName) throw new Error('Unauthorized');

  return await db.transaction(async (tx) => {
    // Create resource
    const [resource] = await tx.insert(resources).values({
      title: params.title,
      description: params.description,
      resourceType: params.resourceType as any,
      externalLink: params.externalLink,
      organization: session.user.organizationName!,
      uploadedBy: session.user.email!,
    }).returning();

    // Create files if any
    if (params.files?.length) {
      await tx.insert(resourceFiles).values(
        params.files.map(file => ({
          resourceId: resource.id,
          fileUrl: file.url,
          fileName: file.name,
        }))
      );
    }

    // Create audit log
    await tx.insert(auditLogs).values({
      userId: session.user.id,
      userEmail: session.user.email!,
      organization: session.user.organizationName!,
      action: 'created',
      resourceId: resource.id,
      resourceTitle: params.title,
      resourceType: params.resourceType,
      metadata: {
        hasFiles: (params.files?.length || 0) > 0,
        fileCount: params.files?.length || 0,
      },
    });

    return resource;
  });
}

// ... Additional service methods follow same pattern
```

### 4.2 Migration Checklist for Services

| Service File | Status | Notes |
|--------------|--------|-------|
| `lib/services/auth.ts` | Replace | Use Auth.js session |
| `lib/services/resources.ts` | Replace | Use Drizzle queries |
| `lib/services/storage.ts` | Update | Change upload destination |
| `lib/services/organizations.ts` | Replace | Use Drizzle queries |
| `lib/services/members.ts` | Replace | Use Drizzle queries |
| `lib/services/audit.ts` | Replace | Use Drizzle queries |
| `lib/services/versions.ts` | Replace | Use Drizzle queries |

---

## Phase 5: Storage Migration

### 5.1 Option A: Cloudflare R2 (Recommended)

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Create `lib/storage/r2.ts`:

```typescript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const key = `${Date.now()}-${filename}`;

  await R2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function deleteFile(fileUrl: string): Promise<void> {
  const key = fileUrl.replace(`${process.env.R2_PUBLIC_URL}/`, '');

  await R2.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  }));
}
```

### 5.2 Option B: MinIO (Self-Hosted)

Same S3 SDK, different endpoint configuration:

```typescript
const MinIO = new S3Client({
  region: 'us-east-1',
  endpoint: process.env.MINIO_ENDPOINT, // e.g., http://localhost:9000
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for MinIO
});
```

---

## Phase 6: Data Migration

### 6.1 Export from Supabase

```bash
# Export database
pg_dump -h db.YOUR_PROJECT.supabase.co -U postgres -d postgres > backup.sql

# Download storage files
# Use Supabase CLI or dashboard to download all files from resource-files bucket
```

### 6.2 Import to New PostgreSQL

```bash
# Create database
createdb napa_resource_hub

# Run Drizzle migrations
npm run db:push

# Apply RLS policies
psql napa_resource_hub < drizzle/rls-policies.sql

# Import data (may need modification for schema differences)
psql napa_resource_hub < backup.sql
```

### 6.3 Migrate Files to New Storage

```typescript
// One-time migration script
import { createClient } from '@supabase/supabase-js';
import { uploadFile } from '@/lib/storage/r2';

async function migrateFiles() {
  const supabase = createClient(OLD_URL, OLD_KEY);

  // List all files
  const { data: files } = await supabase.storage
    .from('resource-files')
    .list();

  for (const file of files) {
    // Download from Supabase
    const { data } = await supabase.storage
      .from('resource-files')
      .download(file.name);

    // Upload to new storage
    const buffer = Buffer.from(await data.arrayBuffer());
    const newUrl = await uploadFile(buffer, file.name, file.metadata?.mimetype);

    // Update database record
    await db.update(resourceFiles)
      .set({ fileUrl: newUrl })
      .where(ilike(resourceFiles.fileUrl, `%${file.name}%`));
  }
}
```

---

## Phase 7: Environment Variables

### 7.1 New Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/napa_resource_hub

# Auth.js
AUTH_SECRET=your-auth-secret-here  # Generate with: openssl rand -base64 32
AUTH_URL=http://localhost:3000

# Email (for magic links)
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=your-email@example.com
EMAIL_SERVER_PASSWORD=your-password
EMAIL_FROM=noreply@napahq.org

# Storage (Cloudflare R2)
R2_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=napa-resource-files
R2_PUBLIC_URL=https://files.napahq.org

# OR Storage (MinIO)
MINIO_ENDPOINT=http://localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=napa-resource-files
```

### 7.2 Remove Old Variables

```env
# Remove these after migration:
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Phase 8: Testing & Deployment

### 8.1 Testing Checklist

- [ ] User can sign up with magic link
- [ ] User can sign in with magic link
- [ ] NAPA emails auto-assigned to NAPA org with admin
- [ ] Resources filtered by organization (RLS)
- [ ] NAPA admins can see all resources
- [ ] File upload works with new storage
- [ ] File download works with new storage
- [ ] Audit logs created correctly
- [ ] Version history works
- [ ] Member management works

### 8.2 VPS Deployment Requirements

**Minimum Requirements:**
- 2 vCPU, 4GB RAM
- 50GB SSD storage
- PostgreSQL 15+
- Node.js 20+

**Recommended Stack:**
```
- Ubuntu 22.04 LTS
- PostgreSQL 15
- Node.js 20 LTS
- PM2 (process manager)
- Nginx (reverse proxy)
- Certbot (SSL)
- MinIO (if self-hosting storage)
```

**Docker Compose Alternative:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/napa
    depends_on:
      - db
      - minio

  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: napa
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

---

## Implementation Order

1. **Phase 1** - Install Drizzle, create schema, verify locally
2. **Phase 2** - Implement RLS policies
3. **Phase 3** - Set up Auth.js, test magic links locally
4. **Phase 4** - Migrate service layer one file at a time
5. **Phase 5** - Set up new storage (R2 or MinIO)
6. **Phase 6** - Migrate data from Supabase
7. **Phase 7** - Update environment variables
8. **Phase 8** - Deploy to VPS, run full test suite

---

## Rollback Plan

If issues occur during migration:

1. Keep Supabase running during transition
2. Use feature flags to toggle between old/new implementations
3. Maintain data sync until cutover is complete
4. DNS switch for instant rollback capability

---

## Estimated Effort

| Phase | Estimated Time |
|-------|---------------|
| Phase 1: Drizzle Setup | 1-2 days |
| Phase 2: RLS Policies | 1 day |
| Phase 3: Auth.js | 2-3 days |
| Phase 4: Service Migration | 3-4 days |
| Phase 5: Storage Migration | 1-2 days |
| Phase 6: Data Migration | 1 day |
| Phase 7: Environment Setup | 0.5 days |
| Phase 8: Testing & Deploy | 2-3 days |
| **Total** | **12-17 days** |

---

**Document Version:** 1.0
**Created:** January 2026
**Status:** Ready for Implementation
