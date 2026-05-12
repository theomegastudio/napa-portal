# Contributing to NAPA Resource Hub

This guide is for developers who are already comfortable with TypeScript and Next.js but are new to this codebase. It covers conventions, patterns, and non-obvious gotchas that will save you debugging time.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind v4, shadcn/ui |
| Auth | Better Auth |
| ORM | Drizzle ORM |
| Database | Neon PostgreSQL |
| File Storage | Cloudflare R2 |
| Icons | Phosphor Icons (files), Lucide React (everything else) |
| Toasts | Sonner |

---

## Adding a New Feature — End-to-End Walkthrough

Follow these steps in order when building a new feature that needs a database table, API route, and UI:

### 1. Schema

Add your table definition to `lib/db/schema.ts` using Drizzle's schema builder.

### 2. Migration

Add a migration SQL block to `scripts/migrate.mjs`. **Never use `drizzle-kit push`** — it requires interactive confirmation and breaks in non-interactive environments. See [Database Migrations](#database-migrations) for the full rules.

```bash
node scripts/migrate.mjs
```

### 3. API Route

Create the route at `app/api/v2/[feature]/route.ts`. All API routes live under `app/api/v2/` — always use the `v2` prefix.

Every protected route must start with this auth check:

```ts
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type { ExtendedUser } from '@/lib/types'

const session = await auth.api.getSession({ headers: await headers() })
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const user = session.user as ExtendedUser
```

### 4. Component

Create a client component in `components/`. See [Component Patterns](#component-patterns) for conventions on dialogs, tables, icons, and toasts.

### 5. Page

Wire the component into a page at `app/(dashboard)/[page]/page.tsx`.

### 6. Sidebar + Nav

Add a nav item to `components/layout/AppSidebar.tsx` and register the route title in `components/layout/TopNav.tsx`. See [Sidebar Navigation](#sidebar-navigation).

---

## API Routes

- All routes live under `app/api/v2/` — do not create routes outside this prefix
- Always authenticate at the top of every handler (pattern above)
- Return `NextResponse.json({ error: '...' }, { status: 4xx })` for error responses
- Cast `session.user` to `ExtendedUser` — the default Better Auth user type is missing project-specific fields

---

## Database Migrations

**Never run `drizzle-kit push`.** It prompts for interactive confirmation and fails in scripts/CI.

Instead:

1. Add your SQL to `scripts/migrate.mjs`
2. Run `node scripts/migrate.mjs`

The migration script uses the `pg` Client directly — **not** `@neondatabase/serverless`'s `neon()` function, which requires tagged template literals and doesn't work with plain string queries.

All statements must be idempotent:

```sql
-- Tables
CREATE TABLE IF NOT EXISTS my_table (...);

-- Columns
DO $$ BEGIN
  ALTER TABLE my_table ADD COLUMN new_col text;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Enums
DO $$ BEGIN
  CREATE TYPE my_enum AS ENUM ('a', 'b');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

---

## Component Patterns

### Dialogs

Use `Dialog` from `components/ui/dialog` for all forms and detail views. It renders centered with a zoom animation.

Do not use `Sheet` for forms — Sheet is reserved for non-form side panels only.

### Tables

Follow the `ResourceTable` pattern:

- Sortable column headers
- `DotsThree` (Phosphor) dropdown for row actions
- Optional `onRowClick` prop to open a detail `Dialog`

### Icons

**File-type icons** — always use `@phosphor-icons/react` with `weight="duotone"` via the icon resolution helpers:

```tsx
import { FILE_ICON_MAP, getFileIconColor, getFileIconName } from '@/lib/file-icons'

const iconName = getFileIconName(mimeType, filename)
const Icon = FILE_ICON_MAP[iconName]  // FILE_ICON_MAP: Record<FileIconName, React.ElementType>
const color = getFileIconColor(iconName)

return <Icon weight="duotone" className={`h-5 w-5 ${color}`} />
```

**All other icons** — use `lucide-react`.

Never mix these up: Phosphor for files, Lucide for everything else.

### Toasts

```ts
import { toast } from 'sonner'

toast.success('Resource saved')
toast.error('Something went wrong')
```

---

## Sidebar Navigation

Edit `components/layout/AppSidebar.tsx`. Add to the `mainNav` array:

```ts
const mainNav: NavItem[] = [
  { title: 'New Page', href: '/new-page', icon: SomeIcon },

  // Admin-only (visible to admins and napaAdmins)
  { title: 'Admin Thing', href: '/admin/thing', icon: SomeIcon, adminOnly: true },

  // napaAdmin-only (NAPA staff only)
  { title: 'Super Admin', href: '/admin/super', icon: SomeIcon, napaAdminOnly: true },

  // Not yet built
  { title: 'Future Feature', href: '/future', icon: SomeIcon, comingSoon: true },
]
```

Also register the page title in `components/layout/TopNav.tsx` in the `PAGE_TITLES` map — the top nav reads from this to display the current page name.

---

## Permissions

Never hardcode role string checks inline. Always use the functions from `lib/permissions.ts`:

```ts
import {
  canViewResource,
  canEditResource,
  canDeleteResource,
  canDownloadResource,
  canArchiveResource,
} from '@/lib/permissions'

canViewResource(user, resourceOrg)
canEditResource(user, resourceOrg, uploadedById)
canDeleteResource(user, resourceOrg)
canDownloadResource(user, resourceOrg, allowDownload)
canArchiveResource(user, resourceOrg)
```

If you need a new permission rule, add it to `lib/permissions.ts` — do not scatter logic across components or API routes.

---

## File Uploads

The upload flow is split across two API calls:

1. Client POSTs `FormData` to `/api/v2/upload` → receives `{ url, name }`
2. Client POSTs resource metadata + the file array to `/api/v2/resources`

Files are stored in Cloudflare R2 and served via `/api/v2/resources/[id]/serve`, which generates signed URLs with a 1-hour expiry — never expose raw R2 URLs directly.

Server-side, the upload route validates files using magic bytes (not just MIME type or extension). That logic lives in `lib/file-validation.ts`. If you need to support a new file type, update the allowed types there.

---

## Search

`CommandSearch` (in `TopNav`) calls `/api/v2/search?q=` with a 200ms debounce and a minimum of 2 characters. Results render with a bordered icon box, title, subtitle, and a `ChevronRight`.

To surface a new entity type in search results, update the search API route handler — do not create a separate search endpoint.

---

## Auth

### Middleware

In Next.js 16, the middleware file is `proxy.ts`, **not** `middleware.ts`. Next.js 16 renamed the convention. If you create `middleware.ts`, it will be silently ignored.

### Session Cookies

| Environment | Cookie name |
|---|---|
| Development | `better-auth.session_token` |
| Production | `__Secure-better-auth.session_token` |

### OTP Re-verification

Users must re-verify via OTP every 60 days. This is enforced in two places:

- `proxy.ts` — redirects unauthenticated or expired sessions
- `app/(dashboard)/layout.tsx` — server-side check as a second gate

If you add a new protected route, both checks already cover it via the layout — no additional work needed.

### NAPA Admin Auto-Promotion

Users with `@napahq.org` or `@napa-online.org` email addresses are automatically granted the `napaAdmin` role on sign-in. This is handled in `lib/auth.ts` via `isNapaEmail()`. Do not replicate this logic elsewhere.

---

## Tailwind v4

This project uses Tailwind v4. Several things work differently from v3:

- **PostCSS config must be `postcss.config.js` (CJS)** — Turbopack ignores `postcss.config.mjs`. If styles stop loading, check this first.
- **No `tailwind.config.ts`** — all theme configuration (colors, spacing, fonts) lives in `app/globals.css` under `@theme inline`.
- **CSS variable shorthand** — `w-(--sidebar-width)` is valid v4 syntax.
- **Animation plugin** — `tw-animate-css` is used instead of `tailwindcss-animate`. Import it in `globals.css` as `@import "tw-animate-css"`.
- **Dark mode** — enabled via `@custom-variant dark (&:is(.dark *))` (class-based, not media query).
- **shadcn components** — components copied from other Tailwind v4 projects work as-is; no conversion step needed.

---

## shadcn Components Not in Registry

Some shadcn components are not available in the Vega registry and were manually copied from `/Users/darshan/Development/greek_os`:

- `components/ui/sidebar.tsx`
- `components/ui/collapsible.tsx`
- `components/ui/sheet.tsx`
- `components/ui/tooltip.tsx`
- `components/ui/popover.tsx`

To update one of these, copy the latest version from `greek_os/components/ui/` or directly from the [shadcn GitHub](https://github.com/shadcn-ui/ui). Do not run `npx shadcn add` for these — it will either fail or overwrite with an incompatible version.

---

## Pinned Dependencies

Several packages are intentionally held at older major versions. Do not upgrade these without a deliberate audit:

| Package | Pinned at | Reason |
|---|---|---|
| `lucide-react` | 0.562.x | v1.x may rename icons used throughout the codebase |
| `typescript` | 5.9.x | TypeScript 6 has breaking changes |
| `nodemailer` | 7.x | v8 has API changes |
| `file-type` | 21.x | v22 is a major release |
| `@types/node` | 20.x | v25 could affect server-side type definitions |

If you need to upgrade one of these, audit the changelog for breaking changes and test the affected paths before merging.

---

## Development Setup

```bash
# Install dependencies
npm install

# Run the dev server (Turbopack)
npm run dev

# Run migrations
node scripts/migrate.mjs

# Type-check
npx tsc --noEmit
```

Environment variables are required for the database, auth, and R2 — copy `.env.example` to `.env.local` and fill in the values before running locally.
