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

That writes `drizzle/####_*.sql`. Apply it manually using a node one-liner (drizzle-kit's own `migrate` doesn't pick up `DATABASE_URL` automatically):

```bash
set -a; source .env.local; set +a
node -e "
const { Client } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  // Run the ALTER/CREATE statements from drizzle/####_*.sql here.
  // Always use IF NOT EXISTS / IF NOT EXISTS guards so it's idempotent.
  await c.query('ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...');
  // Record the migration so drizzle-kit doesn't reapply it.
  const hash = crypto.createHash('sha256')
    .update(fs.readFileSync('drizzle/####_*.sql', 'utf8'))
    .digest('hex');
  await c.query('INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (\$1, \$2)', [hash, Date.now()]);
  console.log('applied');
  await c.end();
})().catch(e => { console.error(e.message); process.exit(1); });
"
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

All statements must be idempotent.

---

## Component Patterns

### Dialogs

Use `Dialog` from `components/ui/dialog` for all forms and detail views. It renders centered with a zoom animation.

Base UI's Dialog API differs from Radix:
- `disablePointerDismissal` (not `onInteractOutside`)
- Use `onOpenChange={(_, e) => e.reason === 'escape-key' && e.cancel()}` to block escape
- `DialogTrigger` accepts a `render` prop (not `asChild`)

Do not use `Sheet` for forms — Sheet is reserved for non-form side panels only.

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

## Org Health

Five-dimension engagement score (0–100). Each dimension has a 16-point baseline so empty orgs start at 80, not 0. Completion brings each dimension to 20. See ADR-006 for the rationale and exact math.

### Annual dues target

The Board sets one platform-wide annual dues target per year via the strip at the top of `/admin/org-health`. Stored in `platform_dues_targets`. Per-org overrides exist in `dues_records.amount_cents` — when present they override the platform target for that org/year.

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
