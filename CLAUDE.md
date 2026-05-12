# NAPA Resource Hub — Claude Code Context

## Project
Next.js 16 App Router app for NAPA (National APIDA Panhellenic Association) member orgs to share policy/procedure/document resources.

## Stack
- Next.js 16.2 (App Router, Turbopack), React 19, TypeScript 5.9
- Tailwind CSS v4 with `@tailwindcss/postcss` (no tailwind.config.ts — config lives in `app/globals.css`)
- shadcn/ui components (vega style)
- Better Auth v1.6 with emailOTP plugin
- Drizzle ORM + Neon PostgreSQL (`@neondatabase/serverless`)
- Cloudflare R2 for file storage (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`)
- `@phosphor-icons/react` — file type icons ONLY (weight="duotone", via FILE_ICON_MAP)
- `lucide-react` — all other UI icons
- `sonner` for toasts, `cmdk` for command palette, `next-themes` for dark/light, `use-debounce` for search

## Route Structure
- `app/(auth)/` — login, signup, forgot-password, verify-email, pending-approval, account-rejected
- `app/(dashboard)/` — protected routes requiring auth + approval
- `app/api/v2/` — all API routes (v2 namespace, no exceptions)

## Auth Flow
1. Signup → `status = 'pending'`
2. Admin approves → `status = 'approved'`
3. Email OTP re-verification required every 60 days (`isOTPVerificationRequired`)
4. `@napahq.org` / `@napa-online.org` emails auto-get `napaAdmin` role
5. Two roles: `napaAdmin` (platform-wide) and org-level `isAdmin` boolean
6. Session cookie: `better-auth.session_token` (prod: `__Secure-better-auth.session_token`)

## Key Files
| File | Purpose |
|------|---------|
| `proxy.ts` | Next.js 16 middleware — MUST be `proxy.ts` not `middleware.ts` (v16 naming); auth gate, redirects unauthenticated to /login |
| `lib/auth.ts` | BetterAuth config: emailOTP, drizzle adapter, bcrypt |
| `lib/auth-client.ts` | Client auth hooks: `useSession`, `signOut`, `isOTPVerificationRequired` |
| `lib/db/schema.ts` | Drizzle schema: users, organizations, resources, resource_files, resource_versions, meetings, resource_access_logs, notifications, audit_log + enums |
| `lib/db/index.ts` | neon-serverless db client |
| `lib/file-icons.ts` | MIME type / extension → Phosphor icon name + color map |
| `lib/file-validation.ts` | Magic-byte validation, `ALLOWED_MIME_TYPES`, `MAX_FILE_SIZE_BYTES` (50MB) |
| `lib/permissions.ts` | `canViewResource`, `canEditResource`, `canDeleteResource`, `canDownloadResource`, `canArchiveResource` |
| `scripts/migrate.mjs` | Custom incremental SQL migration runner via `pg` Client — use this for ALL schema changes |
| `app/globals.css` | Tailwind v4 CSS-first config: `@import "tailwindcss"`, `@theme inline`, `@custom-variant dark` |
| `components/Providers.tsx` | Wraps app in `ThemeProvider` (defaultTheme="light") |
| `components/layout/AppSidebar.tsx` | `collapsible="icon"` sidebar using shadcn sidebar primitives; `NavUser` pattern with `useSidebar()` |
| `components/layout/TopNav.tsx` | Page title + `CommandSearch` |
| `components/CommandSearch.tsx` | cmdk dialog: bordered icon boxes, title+subtitle+ChevronRight, Quick Navigation when no query |
| `components/ResourceTable.tsx` | Sortable table; accepts optional `onRowClick` to open detail dialog |
| `components/ResourceDetailDialog.tsx` | Fetches/displays resource in Dialog; handles archive/delete inline |
| `components/UploadResourceDialog.tsx` | Centered Dialog for adding resources; uploads to R2 then creates DB record |

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/v2/upload` | POST | Upload file to R2, return signed URL |
| `/api/v2/resources` | GET/POST | List (search/filter) or create resource |
| `/api/v2/resources/[id]` | GET/PATCH/DELETE | CRUD single resource |
| `/api/v2/resources/[id]/serve` | GET | Generate signed R2 URL for download |
| `/api/v2/resources/[id]/archive` | POST | Toggle archive status |
| `/api/v2/search?q=` | GET | ilike search on title/description/topicArea |
| `/api/v2/admin/org-health` | GET | Org engagement metrics |
| `/api/v2/admin/meetings` | GET/POST | Meeting attendance records |
| `/api/v2/notifications` | GET | User notifications |

## Migrations
**Always use `node scripts/migrate.mjs`** — NOT `drizzle-kit push`. Uses `pg` Client (not `@neondatabase/serverless`) because neon serverless requires tagged template literals. Runs 25 idempotent SQL statements with `IF NOT EXISTS` / `DO $$ BEGIN...EXCEPTION WHEN duplicate_object` guards.

## Tailwind v4 Setup
- PostCSS config: `postcss.config.js` — must be `.js` (CJS), NOT `.mjs` (Turbopack ignores `.mjs`)
- Plugin: `@tailwindcss/postcss`
- `tw-animate-css` replaces `tailwindcss-animate`
- CSS variable shorthand `w-(--sidebar-width)` works natively in v4
- Dark mode: `@custom-variant dark (&:is(.dark *))`

## shadcn Components
Installed from vega style registry. `sidebar.tsx`, `collapsible.tsx`, `sheet.tsx`, `tooltip.tsx`, `popover.tsx` were copied from `/Users/darshan/Development/greek_os/components/ui` — the vega registry does not include them.

## Environment Variables
```
DATABASE_URL                    # Neon PostgreSQL connection string
BETTER_AUTH_SECRET              # Auth signing secret
BETTER_AUTH_URL / AUTH_URL      # App base URL
CLOUDFLARE_R2_ENDPOINT
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_OAUTH_ENABLED       # Feature flag for Google/Microsoft OAuth buttons
```

## Conventions
- API routes: always under `app/api/v2/`
- File icons: `@phosphor-icons/react` with `weight="duotone"`; look up component via `FILE_ICON_MAP` in `lib/file-icons.ts`
- All other UI icons: `lucide-react`
- Forms/resource actions: centered `Dialog` component — not Sheet, not Popover
- Resource row clicks → open `ResourceDetailDialog`, do not navigate to `/resources/[id]`
- Toasts: `sonner`
- Search debounce: 200–300ms via `useDebouncedCallback`
- No `drizzle-kit push` — always `node scripts/migrate.mjs`

## Dead Files (not yet deleted)
- `components/layout/Sidebar.tsx` — old pre-rewrite sidebar
- `components/AdminLayout.tsx`, `AppHeader.tsx`, `Footer.tsx` — old layout components
- `app/(dashboard)/resources/[resourceId]/page.tsx` — superseded by `ResourceDetailDialog`; kept for direct URL access only

## Pending / Incomplete Work
- **Edit resource**: `onEdit={() => {}}` is a no-op in `page.tsx`; `EditResourceDialogEnhanced.tsx` exists but is not connected
- **NotificationBell**: removed from `AppSidebar` footer during rewrite — needs to be re-added
- **Archive page**: `/archive` route exists but shows "Coming Soon"
- **Admin Organizations page**: `/admin/organizations` shows "Coming Soon"
