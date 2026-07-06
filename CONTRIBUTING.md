# Contributing to NAPA Resource Hub

This guide is for developers comfortable with TypeScript and Next.js but new to this codebase. It covers conventions, patterns, and non-obvious gotchas that will save you debugging time.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind v4, shadcn/ui in `base-vega` style on **Base UI** primitives |
| Auth | Better Auth |
| ORM | Drizzle ORM |
| Database | Neon PostgreSQL |
| File Storage | Cloudflare R2 |
| Icons | Phosphor Icons (files), Lucide React (everything else) |
| Toasts | Sonner |

---

## Adding a New Feature - End-to-End Walkthrough

Follow these steps in order when building a new feature that needs a database table, API route, and UI:

### 1. Schema

Add your table definition to `lib/db/schema.ts` using Drizzle's schema builder. Add a relation block if the new table references existing ones.

### 2. Migration

```bash
npm run db:generate
```

That writes `drizzle/####_*.sql`. Apply it manually using a node one-liner:

```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  // Run the ALTER/CREATE statements from drizzle/####_*.sql here.
  // Always use IF NOT EXISTS guards so it's idempotent.
  await c.query('ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...');
  // Record the migration so drizzle-kit doesn't reapply it.
  const hash = crypto.createHash('sha256')
    .update(fs.readFileSync('drizzle/####_*.sql', 'utf8'))
    .digest('hex');
  await c.query(
    'INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (\$1, \$2)',
    [hash, Date.now()]
  );
  console.log('applied');
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
"
```

> **Do NOT use `set -a; source .env.local; set +a`** — Neon's `DATABASE_URL` contains `&` characters that break shell parsing. Always load env with `require('dotenv').config()` inside the node script.

**Apply to both Neon branches.** The project has two branches (`development` and `main`). After applying a migration to the dev branch, apply it to main too by overriding `DATABASE_URL`:

```bash
DATABASE_URL="postgresql://neondb_owner:...@ep-holy-resonance...neon.tech/neondb?sslmode=require" \
  node -e "require('dotenv').config(); ..."
```

The old `scripts/migrate.mjs` runner is gone — don't reach for it.

### 3. Service

Add a service file at `lib/services-drizzle/<entity>.ts`. Every function should call `requireApprovedAuth()` or `requireAuth()` at the top, then enforce the relevant permission via `lib/permissions.ts`. Existing examples:

- `lib/services-drizzle/organizations.ts` (CRUD + listOrganizationsWithCounts)
- `lib/services-drizzle/org-compliance.ts` (yearly flag toggles)
- `lib/services-drizzle/members.ts` (invite + role updates with NAPA gating)

### 4. API Route

Create the route at `app/api/v2/[feature]/route.ts`. All API routes live under `app/api/v2/` — always use the `v2` prefix.

```ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type { ExtendedUser } from '@/lib/types'

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = session.user as ExtendedUser
  // ...
}
```

### 5. Component

Client component in `components/`. See [Component Patterns](#component-patterns).

### 6. Page

`app/(dashboard)/[page]/page.tsx`. Follow the unified page layout (page header on top, filters inline, table card below — no outer Card wrapper).

### 7. Sidebar + Nav

Add a nav item to `components/layout/AppSidebar.tsx`'s `mainNav` or `adminNav` array, and register the page title in `components/layout/TopNav.tsx`'s `SEGMENT_LABELS` map. Use the gate flags:

- `adminOnly: true` — org admin or NAPA staff
- `napaAdminOnly: true` — NAPA Board or Director
- `napaBoardOnly: true` — Board only
- `orgHealthGated: true` — Board always; Director only when `canViewOrgHealth = true`

The same gating mirror in `components/CommandSearch.tsx`'s `NAV_PAGES` — please update both so role-restricted pages don't show up for users who can't access them.

---

## API Routes

- All routes live under `app/api/v2/` — do not create routes outside this prefix
- **All protected routes must call `requireApprovedAuth()`**, not `requireAuth()`. `requireApprovedAuth()` checks both approval status AND OTP freshness (session age). See ADR-008.
- Return `NextResponse.json({ error: '...' }, { status: 4xx })` for error responses with the pattern:
  ```ts
  try {
    await requireApprovedAuth()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unauthorized'
    const status = msg === 'Unauthorized' ? 401 : 403
    return NextResponse.json({ error: msg }, { status })
  }
  ```
- Cast `session.user` to `ExtendedUser` — the default Better Auth user type is missing project-specific fields
- For role-sensitive writes, prefer `user.role === 'napaBoard'` over a generic `isAdmin` check. NAPA Director and org admins are intentionally limited
- **Always enforce permission checks at the service layer**, not just at the API layer. Example:
  ```ts
  // ✅ CORRECT: check in the service function
  if (!canEditResource(user, resource.organization)) {
    throw new Error('Unauthorized')
  }
  ```
- Never skip permission checks when data is org-scoped. A user from org A cannot edit org B's resources, even with global admin privileges. Use helpers from `lib/permissions.ts`

---

## Database Migrations

**Never run `drizzle-kit push`.** It prompts for interactive confirmation and fails in scripts/CI.

Instead, follow the flow in [Adding a New Feature - Migration](#2-migration). The lifecycle is:

1. Edit `lib/db/schema.ts`
2. `npm run db:generate` (writes `drizzle/####_*.sql`)
3. Apply the SQL via the node `pg` one-liner above, with `IF NOT EXISTS` guards
4. Insert the migration hash into `drizzle.__drizzle_migrations` so drizzle-kit knows it's been applied

All statements must be idempotent. **Apply every change to BOTH Neon branches** (`development` and `main`) — see CLAUDE.md "Neon Branches".

### Watch for schema drift (ADR-012)

`drizzle-kit generate` diffs the schema against its **snapshot**, not the live DB, so a column that silently differs from the live database produces no migration and is invisible until a query hits it. The known instance: **user-id columns must be `text`, not `uuid`** (BetterAuth `users.id` is text, not a UUID). If you see `invalid input syntax for type uuid` (Postgres `22P02`) on a `user_id` / `*_by` / `uploaded_by` column, the column has drifted — fix the **column type**, never the failing user row:

```sql
ALTER TABLE <table> ALTER COLUMN <col> TYPE text USING <col>::text;  -- apply to both branches
```

Audit for this class of drift:

```sql
SELECT table_name, column_name, data_type FROM information_schema.columns
WHERE table_schema='public'
  AND (column_name LIKE '%user_id%' OR column_name LIKE '%uploaded_by%' OR column_name LIKE '%\_by')
  AND data_type='uuid';  -- expect zero rows
```

---

## Component Patterns

### Dialogs

Use `Dialog` from `components/ui/dialog` for all forms and detail views. It renders centered with a zoom animation.

Base UI's Dialog API differs from Radix:
- `disablePointerDismissal` (not `onInteractOutside`)
- Use `onOpenChange={(_, e) => e.reason === 'escape-key' && e.cancel()}` to block escape
- `DialogTrigger` accepts a `render` prop (not `asChild`)

Do not use `Sheet` for forms — Sheet is reserved for non-form side panels only.

**Width caps must be `sm:`-prefixed.** Write `<DialogContent className="sm:max-w-2xl ...">`, never a bare `max-w-2xl`. A bare cap wins over the base dialog's mobile guard `max-w-[calc(100%-2rem)]` via tailwind-merge and makes the dialog full-bleed (no side gutters) on phones. This is a hard rule (ADR-011).

### `asChild` → `render`

Base UI replaces Radix's `asChild` with `render`:

```tsx
// Radix
<Button asChild>
  <Link href="/foo">Click</Link>
</Button>

// Base UI
<Button render={<Link href="/foo" />}>Click</Button>
```

The shadcn `Button` wrapper auto-sets `nativeButton={false}` when `render` is provided so warnings don't fire.

### Tables

Every list page wraps `<Table>` in `<div className="rounded-lg border bg-card overflow-hidden">`. Optionally add `<TablePagination>` from `components/ui/table-pagination.tsx` to get a Prev/Next footer with clear disabled state.

Sort state is plain `useState` (we don't use TanStack). Filter state resets `page` to 0 on change.

**Responsiveness (ADR-011).** `TableCell` defaults to `whitespace-nowrap`, so a long value in a flexible column will expand the table past the viewport and hide other columns behind the horizontal scrollbar. For the one flexible text column:

```tsx
<TableCell className="max-w-[200px] sm:max-w-sm md:max-w-md whitespace-normal">
  <button className="... line-clamp-1 break-words">{row.title}</button>
  {row.description && <p className="... line-clamp-1 break-words">{row.description}</p>}
</TableCell>
```

Hide low-priority columns on narrow screens by putting the SAME responsive class on both the `TableHead` and its `TableCell` — e.g. Organization `hidden sm:table-cell`, Type/Added `hidden md:table-cell`. Hidden fields must still be reachable in the row's detail dialog. `ResourceTable.tsx` is the reference implementation.

### Responsive headers & toolbars (ADR-011)

Page headers with a title + action buttons must stack on mobile, and multi-button groups must wrap:

```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <h2 className="text-lg font-semibold">Title</h2>
    <p className="text-sm text-muted-foreground">subtitle</p>
  </div>
  <div className="flex flex-wrap items-center gap-2">
    {/* year Select, Export, Add, … */}
  </div>
</div>
```

When a long title sits next to actions in a single row, give the title `min-w-0` (so it can shrink/truncate) and the button group `shrink-0`. The dashboard `main` uses `p-4 sm:p-6`; don't hardcode `p-6`. The mobile nav hamburger (`SidebarTrigger` in `TopNav`, `md:hidden`) is what opens the off-canvas sidebar — a layout without it is unusable on mobile.

### Role & status badges

Role pills follow one color scheme everywhere (Org Users and All Users): NAPA Board = `bg-primary/10 text-primary` (gold), NAPA Director = `bg-purple-100 text-purple-800`, Admin = `bg-sky-100 text-sky-800`, Member/User = `bg-muted text-muted-foreground`. Derive the pill from `roleSelectValue(role, isAdmin)` (in `OrgUsersClient.tsx`) so it always matches the edit dialog's role dropdown; `/admin/users` has an equivalent inline `getRoleBadge`. Status pills: Approved = green, Pending = yellow, Rejected/Banned = red. The "NEW" resource pill and sidebar count badge are `bg-primary text-primary-foreground` (gold) — do not use `bg-blue-*` for these.

Date-only fields (meeting date, dues payment date) render through `formatDateOnly()` from `lib/format.ts` — a thin wrapper around `toLocaleDateString({ timeZone: 'UTC' })` — to avoid the off-by-one bug in negative-offset timezones.

### Icons

**File-type icons** — always `@phosphor-icons/react` with `weight="duotone"`:

```tsx
import { FILE_ICON_MAP, getFileIconColor, getFileIconName } from '@/lib/file-icons'

const iconName = getFileIconName(mimeType, filename)
const Icon = FILE_ICON_MAP[iconName]
const color = getFileIconColor(iconName)

return <Icon weight="duotone" className={`h-5 w-5 ${color}`} />
```

**All other icons** — `lucide-react`. Never mix them up.

### Toasts

```ts
import { toast } from 'sonner'
toast.success('Resource saved')
toast.error('Something went wrong')
```

### Org URLs

Use `orgSlug(name)` from `lib/slug.ts` when linking to an org:

```tsx
import { orgSlug } from '@/lib/slug'
<Link href={`/org/${orgSlug(org.organizationName)}`}>...</Link>
```

The detail page accepts both the slug and the exact name (legacy support).

---

## Permissions

Use `lib/permissions.ts` functions instead of inline role checks:

```ts
import {
  canViewResource, canEditResource, canDeleteResource,
  canDownloadResource, canArchiveResource,
  isNapaBoard, isNapaDirector, isNapaUser,
  canViewOrgHealth, canApproveUsers, canManageRoles,
} from '@/lib/permissions'
```

If you need a new permission rule, add it there — do not scatter logic across components or API routes.

### Notable nuances

- `canDeleteResource` / `canArchiveResource`: only an admin from the resource's owning org can delete or archive. NAPA staff are intentionally locked out. Keep server-side checks aligned.
- `canViewOrgHealth`: NAPA Board always; Director only if their `canViewOrgHealth` flag is true. The flag is editable on `/admin/users` by Board.
- NAPA role grants (`napaBoard`, `napaDirector`) can only be assigned in the **NAPA org** (`National APIDA Panhellenic Association`). Both `/api/v2/admin/users/[userId]` and `/api/v2/members` POST/PATCH enforce this server-side.
- `canViewResource`, `canEditResource`, `canDeleteResource` enforce cross-org isolation: non-NAPA users can only access their own org's resources, even if they have `isAdmin = true`. See ADR-009.
- **User approvals are org-scoped in the service layer, not via `canApproveUsers`.** `lib/services-drizzle/approvals.ts` does its own checks: `getPendingApprovals()` filters org admins to their own org (NAPA admins see all), and `approveUser`/`rejectUser` throw on a cross-org target and force the first-user-in-org through NAPA. The `canApproveUsers` helper in `permissions.ts` is currently **unused dead code** — if you wire it in, remember it is *not* org-scoped on its own; the route/service still owns org-scoping. Consider deleting it or routing the approvals endpoints through it (scoped) to keep the permission model single-sourced.

### Permission Enforcement Pattern

When building any endpoint that reads/writes org-scoped data:

```ts
// ✅ CORRECT: enforce via permission helper
if (!canEditResource(user, resource.organization)) {
  throw new Error('Unauthorized: Cannot edit resources from another organization')
}

// ❌ WRONG: global isAdmin check allows cross-org access
if (!user.isAdmin) {
  throw new Error('Admin only') // org admin from org B can now edit org A's resource!
}
```

Org-scoped list endpoints must also filter by organization:

```ts
// In getResources()
const conditions = [isNull(resources.deletedAt)]
if (!user.isNapaAdmin && user.organizationName) {
  conditions.push(eq(resources.organization, user.organizationName)) // non-NAPA sees only own org
}
```

Service functions like `getResourceById()` should return `null` for cross-org lookups (mimics "not found" and hides resource existence):

```ts
if (!canViewResource(user, resource.organization)) {
  return null // not throwing — prevents ID enumeration
}
```

---

## Input Validation

All user input (from request bodies, query params, file uploads) must be validated at the API boundary. Do not trust client-supplied data.

### Enum Validation

When a route accepts an enum value (e.g., `meetingType`), validate it server-side:

```ts
const MEETING_TYPES = ['monthly', 'annual', 'general', 'board', 'committee', 'special'] as const
const meetingType = body.meetingType

if (!MEETING_TYPES.includes(meetingType)) {
  return NextResponse.json({ error: 'Invalid meeting type' }, { status: 400 })
}
```

### Length Bounds

Validate string fields have reasonable bounds:

```ts
const title = body.title?.trim() || ''
if (title.length < 1 || title.length > 200) {
  return NextResponse.json({ error: 'Title must be 1–200 characters' }, { status: 400 })
}
```

### Date Validation

Parse and validate dates:

```ts
const meetingDate = new Date(body.meetingDate)
if (isNaN(meetingDate.getTime())) {
  return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
}
```

---

## File Uploads

The upload flow is split across two API calls:

1. Client POSTs `FormData` to `/api/v2/upload` → receives `{ url, name }`
2. Client POSTs resource metadata + the file array to `/api/v2/resources`

Files are stored in Cloudflare R2 and served via `/api/v2/resources/[id]/serve`, which generates signed URLs with a 5-minute expiry. The serve route also writes a `'downloaded'` audit log entry so org admins can see who downloaded what.

`allowDownload` is a per-resource boolean. The UploadResourceDialog surfaces a checkbox only when files are attached. False means non-owner-org users can still see the resource but can't grab the file.

Server-side, the upload route validates files using magic bytes (not just MIME type or extension). That logic lives in `lib/file-validation.ts`. To support a new file type, update the allowed types there.

---

## Search

The cmdk `CommandSearch` lives in the **sidebar** (not TopNav) and is gated by user role:

- `NAV_PAGES` in `components/CommandSearch.tsx` has `adminOnly`, `napaOnly`, `napaBoardOnly` flags
- The visible list filters based on the current user's role before rendering

To surface a new resource type in **server-side search results**, update the `/api/v2/search?q=` handler — do not create a separate endpoint.

### Sidebar badges

`/api/v2/sidebar-badges` returns `{newResourcesCount, approvalsCount, lastResourcesViewedAt}`. AppSidebar polls every 60s. The home page calls `/api/v2/resources/mark-viewed` on mount to clear the "new resources" count (after capturing the prior timestamp so the NEW pill can render on individual rows).

---

## Auth

### Middleware

In Next.js 16, the middleware file is `proxy.ts`, **not** `middleware.ts`. If you create `middleware.ts`, it will be silently ignored.

### Session Cookies

| Environment | Cookie name |
|---|---|
| Development | `better-auth.session_token` |
| Production | `__Secure-better-auth.session_token` |

### OTP Re-verification (60-day window)

Users must re-verify via OTP every 60 days. Enforced at **three independent layers** (keep them in sync):

1. **`proxy.ts` middleware** — redirects stale sessions away from dashboard URLs at the edge
2. **`app/(dashboard)/layout.tsx`** — server-side gate on layout render
3. **`requireApprovedAuth()`** — throws on all `/api/v2/*` routes if session is older than 60 days

All three read from `isOTPVerificationRequired()` in `lib/auth.ts`, so changing `OTP_VALIDITY_DAYS` updates all three. The API-layer check (3) was added 2026-05-14 to prevent direct API calls from bypassing the UI gate. See ADR-008.

### NAPA Email Signup

Users with `@napahq.org` or `@napa-online.org` emails are placed in the NAPA org at signup and gain `isAdmin = true` in that org. **They are NOT auto-approved** and **their role stays `'user'` until a NAPA Board member explicitly promotes them**. This prevents fake-email auth bypass. See `lib/auth.ts` `isNapaEmail()`.

To promote a new NAPA Board / Director:

1. User signs up (pending approval)
2. NAPA Board approves them in `/admin/approvals`
3. Board edits the user in `/admin/users` and sets their `role` to `napaBoard` or `napaDirector`

---

## Tailwind v4

This project uses Tailwind v4. Several things work differently from v3:

- **PostCSS config must be `postcss.config.js` (CJS)** — Turbopack ignores `postcss.config.mjs`. If styles stop loading, check this first.
- **No `tailwind.config.ts`** — all theme configuration lives in `app/globals.css` under `@theme inline`.
- **CSS variable shorthand** — `w-(--sidebar-width)` is valid v4 syntax.
- **Animation plugin** — `tw-animate-css` (not `tailwindcss-animate`). Import via `@import "tw-animate-css"` in globals.css.
- **No dark mode** — `.dark` block and `@custom-variant dark` were removed. App is light-only. Don't reintroduce dark variants unless we revisit the decision.

---

## Org Names

Organization names are stored as a **text primary key** on the `organizations` table, referenced as a FK string by every other org-scoped table. The format is the **short colloquial name** — no legal suffix. See ADR-010.

```
✅  alpha Kappa Delta Phi
✅  Delta Epsilon Psi
✅  National APIDA Panhellenic Association   ← NAPA org is unchanged

❌  alpha Kappa Delta Phi International Sorority, Inc.
❌  Delta Epsilon Psi National Fraternity, Inc.
```

If you're importing data from an external source (CSV, webhook, API) that uses full legal names, strip the suffix before inserting. A mismatch causes FK violations on child-table inserts, which surface as a Postgres error at runtime.

The full set of suffixes to strip:
- `International Fraternity, Inc.`
- `International Sorority, Inc.`
- `National Fraternity, Inc.`
- `National Sorority, Inc.`

## NAPA Board/Director — Null `organizationName` in Session

NAPA Board and Director users who were promoted via `/admin/users` (after their initial signup) may have `organizationName = null` in their BetterAuth session token. The token is minted at signup, before the role promotion happens.

Whenever a page or component needs the user's org name, apply this fallback:

```ts
import { NAPA_ORG_NAME } from '@/lib/constants'

const isNapaAdmin = user?.role === 'napaBoard' || user?.role === 'napaDirector'
const organizationName = user?.organizationName ?? (isNapaAdmin ? NAPA_ORG_NAME : null)
```

Do not call API routes with `organizationName = null` — they will reject or return empty results. The fallback handles the gap until the user refreshes their session.

## Org Health

Five-dimension engagement score (0–100). Each dimension has a 16-point baseline so empty orgs start at 80, not 0. Completion brings each dimension to 20. See ADR-006 for the rationale and exact math.

### Annual dues target

The Board sets one platform-wide annual dues target per year via the strip at the top of `/admin/org-health`. Stored in `platform_dues_targets`. Per-org overrides exist in `dues_records.amount_cents` — when present they override the platform target for that org/year.

### Due dates (added 2026-06-06)

`platform_dues_targets` has three nullable timestamp columns for Board-visible deadlines:

| Column | Purpose | 2025 | 2026 |
|---|---|---|---|
| `dues_due_date` | When dues must be paid | null | 2026-10-15 |
| `renewal_due_date` | Renewal + cert deadline | null | 2026-06-14 |
| `one_on_one_due_date` | 1×1 meeting deadline | null | 2026-09-30 |

These are read-only in the current UI — Board sets them manually via the `platform_dues_targets` table. A UI to edit them on the Org Health page is planned but not yet built. Migration: `drizzle/0009_noisy_nighthawk.sql`.

### NAPAAM scoring

Annual ("NAPAAM") meetings get their own column. Attendee count per org per meeting is stored on `meeting_attendance.attendee_count`. Score: 2+ = 20, 1 = 10, 0 = 0 once the meeting date has passed; before that, baseline 16.

### Monthly past-only

Future monthly meetings show in the `X/12` attended column but don't drag the score down. Server filters by `meetingDate < now` for the score calc.

### Self-service detail page

`/org/[slug]` is accessible to any approved user of that org (own-org) AND to NAPA staff (any org). The page shows score tiles, year-filterable leaders, and meetings attended for the year. Leaders can be year-tagged via `org_leaders.year` (NULL = ongoing); when filtering by year, the page returns both year-specific rows and ongoing ones.

---

## Pinned Dependencies

| Package | Pinned at | Reason |
|---|---|---|
| `lucide-react` | 0.562.x | v1.x may rename icons used throughout the codebase |
| `typescript` | 5.9.x | TypeScript 6 has breaking changes |
| `nodemailer` | 7.x | v8 has API changes |
| `file-type` | 21.x | v22 is a major release |
| `@types/node` | 20.x | v25 could affect server-side type definitions |

Don't upgrade these without auditing the changelog and testing the affected paths.

---

## Development Setup

```bash
npm install
npm run dev                 # Turbopack dev server
npm run db:generate         # after schema changes
npx tsc --noEmit            # type-check
```

Environment variables required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`. Copy `.env.local.example` to `.env.local` to seed.

### Seeding data

```bash
node scripts/seed.mjs
```

The seed script (`scripts/seed.mjs`) is idempotent — safe to run multiple times against a branch that already has data. It reads `.env.local` automatically. To target a different Neon branch:

```bash
DATABASE_URL="postgresql://..." node scripts/seed.mjs
```

The script covers: all 19 orgs (18 members + NAPA), `finance@napahq.org` as napaBoard, 2025 and 2026 monthly meetings + NAPAAM, full 2025 attendance, Jan–Apr 2026 attendance, platform dues targets with due dates, 2025 dues records/payments, and 2025 compliance flags.

**Tables without a unique constraint** (`meeting_attendance`, `dues_records`, `org_yearly_compliance`) use a SELECT-then-INSERT pattern instead of `ON CONFLICT`:

```js
const { rows } = await db.query(
  `SELECT id FROM meeting_attendance WHERE meeting_id=$1 AND organization_name=$2`,
  [meetingId, orgName]
)
if (rows.length > 0) {
  await db.query(`UPDATE meeting_attendance SET ... WHERE id=$1`, [rows[0].id])
} else {
  await db.query(`INSERT INTO meeting_attendance ...`, [...])
}
```

Do not add `ON CONFLICT` to these tables without first creating the corresponding unique index in a migration.
