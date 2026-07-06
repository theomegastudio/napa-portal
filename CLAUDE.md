# NAPA Resource Hub - Claude Code Context

## Project
Next.js 16 App Router app for NAPA (National APIDA Panhellenic Association) member orgs to share resources, track engagement, and manage organizational health.

## Stack
- Next.js 16.2 (App Router, Turbopack), React 19, TypeScript 5.9
- Tailwind CSS v4 with `@tailwindcss/postcss` (no `tailwind.config.ts`; theme lives in `app/globals.css` under `@theme inline`)
- shadcn/ui in `base-vega` style — components are built on **Base UI** (`@base-ui/react`), not Radix. The CLI registry is plain shadcn — Coss UI was tried and then removed (see ADR-004).
- Better Auth v1.6 with emailOTP plugin
- Drizzle ORM + Neon PostgreSQL (`@neondatabase/serverless`)
- Cloudflare R2 for file storage (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`)
- `@phosphor-icons/react` — file-type icons only (weight="duotone", via `FILE_ICON_MAP`)
- `lucide-react` — every other UI icon
- `sonner` for toasts, `cmdk` for command palette, `use-debounce` for search
- Light mode only — dark mode removed in 2026-05 (see ADR-004).

## Route Structure
- `app/(auth)/` — login, signup, forgot-password, verify-email, pending-approval, account-rejected
- `app/(dashboard)/` — protected routes requiring auth + approval
- `app/(dashboard)/org/[slug]/` — self-service org detail page (org members for own org; NAPA staff for any org)
- `app/api/v2/` — all API routes (v2 namespace; no exceptions)

## Auth + Roles

### Roles
| Role | Source | Capabilities |
|---|---|---|
| `user` | default | Approved member |
| `admin` | per-user `isAdmin` boolean (separate from `role`) | Org-level admin |
| `napaBoard` | `role` column | Full cross-org write + approve users + grant roles + CRUD orgs |
| `napaDirector` | `role` column | Read+write across orgs but no approvals. Org Health gated by `canViewOrgHealth` flag |

Migration ran 2026-05-12: existing `napaAdmin` role → `napaBoard`. See ADR-005.

`auth-helpers.AuthUser` exposes `isNapaBoard`, `isNapaDirector`, and `isNapaAdmin` (alias for board || director). Use these instead of raw `role` checks.

### Auth Flow
1. Signup → `status = 'pending'` (all users, including NAPA email domain)
2. NAPA Board approves in `/admin/approvals` → `status = 'approved'`
3. Email OTP re-verification required every 60 days. Enforced at three layers: `proxy.ts` (edge), dashboard layout (server), and `requireApprovedAuth()` (API). See ADR-008.
4. `@napahq.org` / `@napa-online.org` emails are placed in the NAPA org (`National APIDA Panhellenic Association`) and get `isAdmin = true` automatically. They still require Board approval and do NOT auto-escalate to `napaBoard` / `napaDirector` roles.
5. To promote a NAPA user to Board/Director: existing Board member edits them in `/admin/users` and sets `role` to `napaBoard` or `napaDirector`.
6. Session cookie: `better-auth.session_token` (prod: `__Secure-better-auth.session_token`)

## Key Files
| File | Purpose |
|------|---------|
| `scripts/seed.mjs` | Idempotent seed script — inserts 2025+2026 orgs, meetings, attendance, dues, compliance into either Neon branch. Run with `node scripts/seed.mjs`; reads `.env.local` automatically. Override DB with `DATABASE_URL=... node scripts/seed.mjs`. |
| `proxy.ts` | Next.js 16 middleware — MUST be `proxy.ts` (v16 naming); auth gate, redirects unauthenticated to /login |
| `lib/auth.ts` | BetterAuth config: emailOTP, drizzle adapter, bcrypt, rate limiting |
| `lib/auth-helpers.ts` | `requireAuth`, `requireApprovedAuth` (enforces approval + OTP freshness), `AuthUser` shape with role flags |
| `lib/auth-client.ts` | Client auth hooks: `useSession`, `signOut`, `isOTPVerificationRequired` |
| `lib/constants.ts` | Single source of truth: `NAPA_ORG_NAME = 'National APIDA Panhellenic Association'` |
| `lib/permissions.ts` | `canViewResource`, `canEditResource`, `canDeleteResource` (owner-org admin only), `canDownloadResource`, `canArchiveResource`, `canViewOrgHealth` |
| `lib/db/schema.ts` | Drizzle schema |
| `lib/db/index.ts` | neon-serverless db client |
| `lib/file-icons.ts` | MIME type / extension → Phosphor icon name + color map |
| `lib/file-validation.ts` | Magic-byte validation, `ALLOWED_MIME_TYPES`, `MAX_FILE_SIZE_BYTES` (50MB) |
| `lib/slug.ts` | `orgSlug(name)` — kebab-case org slug for URLs |
| `lib/format.ts` | `formatDateOnly(iso)` — UTC-safe date display for meeting/payment dates |
| `app/globals.css` | Tailwind v4 CSS-first config |
| `components/Providers.tsx` | TooltipProvider only (ThemeProvider removed) |
| `components/layout/AppSidebar.tsx` | `variant="inset"` sidebar with role-filtered nav + sidebar badges |
| `components/layout/TopNav.tsx` | Breadcrumb trail (page title moved into pages) |
| `components/CommandSearch.tsx` | cmdk dialog + sidebar trigger button; visible nav filtered by user role |
| `components/ResourceTable.tsx` | Sortable manual table; row click → `ResourceDetailDialog`; supports `lastViewedAt` for NEW badge |
| `components/ResourceDetailDialog.tsx` | Fetches/displays resource in Dialog; handles archive/delete inline |
| `components/UploadResourceDialog.tsx` | Add Resource; file upload triggers "allow other orgs to download" checkbox |
| `components/EditResourceDialogEnhanced.tsx` | Edit resource; supports controlled `open` for row-triggered usage |
| `components/OrgUsersClient.tsx` | Org user list/invite/edit (renamed from `OrganizationMembersClient.tsx`) |
| `components/ui/table-pagination.tsx` | Reusable Prev/Next pagination footer on shadcn buttons |

## API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/v2/upload` | POST | Upload file to R2, return URL |
| `/api/v2/resources` | GET/POST | List (search/filter) or create resource. POST accepts `allowDownload` |
| `/api/v2/resources/[id]` | GET/PATCH/DELETE | CRUD single resource |
| `/api/v2/resources/[id]/serve` | GET | Signed R2 download URL; emits `downloaded` audit entry |
| `/api/v2/resources/[id]/archive` | POST | Toggle archive (owner-org admin only) |
| `/api/v2/resources/mark-viewed` | POST | Bump `users.last_resources_viewed_at` (clears NEW badge) |
| `/api/v2/search?q=` | GET | ilike search |
| `/api/v2/members` | GET/POST | Org users list; POST accepts `role` for NAPA org |
| `/api/v2/members/[memberId]` | PATCH/DELETE | Update/remove member; PATCH accepts `role` (Board-only) |
| `/api/v2/sidebar-badges` | GET | `{newResourcesCount, approvalsCount, lastResourcesViewedAt}` |
| `/api/v2/admin/organizations` | GET/POST | List with counts; create (Board) |
| `/api/v2/admin/organizations/[id]` | PATCH/DELETE | Update/delete; PATCH auto-sets `inactivated_at` on flip |
| `/api/v2/admin/users` | GET/POST | All users; invite/role grant |
| `/api/v2/admin/approvals` | GET | Pending users |
| `/api/v2/admin/audit` | GET | Audit logs (org-scoped for non-NAPA) |
| `/api/v2/admin/meetings` | GET/POST | Meeting list/create |
| `/api/v2/admin/meetings/[id]` | PATCH/DELETE | Edit meeting + bulk-upsert per-org attendance (with `attendeeCount`) |
| `/api/v2/admin/org-health` | GET | Per-org metrics + 5-dimension engagement score |
| `/api/v2/admin/org-health/napaam` | POST | Set per-org NAPAAM attendee count for a year |
| `/api/v2/admin/org-compliance` | GET/PATCH | Yearly renewal + 1×1 flags |
| `/api/v2/admin/dues` | POST | Upsert org's dues record (target amount) |
| `/api/v2/admin/dues/[id]/payments` | POST | Add a payment toward the year's dues |
| `/api/v2/admin/dues/payments/[id]` | DELETE | Remove a payment |
| `/api/v2/admin/dues-target` | GET/POST | Platform-wide annual dues target (Board-only POST) |
| `/api/v2/admin/org-leaders` | GET/POST | Org contacts (own-org admin OR Board can write) |
| `/api/v2/admin/org-leaders/[id]` | PATCH/DELETE | Edit/remove leader |
| `/api/v2/org/[slug]` | GET | Self-service org detail (own-org member OR NAPA staff) |

## Migrations
Use **drizzle-kit** + a small node script that applies the generated SQL with the `pg` client and records the hash in `drizzle.__drizzle_migrations`. Pattern:

```bash
# 1. Edit lib/db/schema.ts
# 2. Generate migration
npm run db:generate
# 3. Apply manually. DATABASE_URL contains & characters that break shell source;
#    load it inside the node script with dotenv instead:
node -e "
  require('dotenv').config({ path: '.env.local' });
  const { Client } = require('pg');
  (async () => {
    const c = new Client({ connectionString: process.env.DATABASE_URL });
    await c.connect();
    await c.query('ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...');
    // Record migration hash so drizzle-kit won't reapply it
    const { createHash } = require('crypto');
    const { readFileSync } = require('fs');
    const sql = readFileSync('drizzle/####_*.sql', 'utf8');
    const hash = createHash('sha256').update(sql).digest('hex');
    await c.query('INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (\$1, \$2)', [hash, Date.now()]);
    console.log('applied');
    await c.end();
  })().catch(e => { console.error(e.message); process.exit(1); });
"
```

**Important:** `set -a; source .env.local; set +a` fails when `DATABASE_URL` contains `&` (Neon connection strings always do). Always use `require('dotenv').config()` inside the node script instead.

The legacy `scripts/migrate.mjs` is no longer used.

### Applying migrations to multiple Neon branches

When a migration is applied to the dev branch but not yet to main (or vice versa), apply it to the other branch by overriding `DATABASE_URL` inline:

```bash
DATABASE_URL="postgresql://..." node -e "require('dotenv').config(); ..."
# Or run the migration node one-liner with the target branch URL set in the environment
```

Migration `0009_noisy_nighthawk.sql` was applied to both branches on 2026-06-06:
```sql
ALTER TABLE "platform_dues_targets" ADD COLUMN "dues_due_date" timestamp with time zone;
ALTER TABLE "platform_dues_targets" ADD COLUMN "renewal_due_date" timestamp with time zone;
ALTER TABLE "platform_dues_targets" ADD COLUMN "one_on_one_due_date" timestamp with time zone;
```

### Schema drift: user-id columns must be `text`, not `uuid` (ADR-012)

BetterAuth `users.id` is **text** (short random strings, not UUIDs). Every column that stores a user id must be `text`: `audit_logs.user_id`, `resource_versions.updated_by_user_id`, `resources.uploaded_by`, `*_by`, etc. The Drizzle schema already declares these correctly, but the live DBs had **drifted to `uuid`**, which broke writes with `invalid input syntax for type uuid` (Postgres `22P02`) on any non-UUID user id — i.e. for every user.

`drizzle-kit generate` does **not** catch this — it diffs the schema against its snapshot, not the live DB. Fix drift in-place on **both** branches (no schema edit / migration file needed):

```sql
ALTER TABLE <table> ALTER COLUMN <col> TYPE text USING <col>::text;
```

Applied 2026-07-06 to both branches: `audit_logs.user_id` and `resource_versions.updated_by_user_id` (both were `uuid`, now `text`). **Diagnostic:** a `22P02` on a `user_id`/`*_by` column means column-type drift — fix the column type, never the failing user row.

## Tailwind v4 Setup
- PostCSS config: `postcss.config.js` — must be `.js` (CJS), NOT `.mjs` (Turbopack ignores `.mjs`)
- Plugin: `@tailwindcss/postcss`
- `tw-animate-css` replaces `tailwindcss-animate`
- CSS variable shorthand `w-(--sidebar-width)` works natively in v4
- **No dark mode**. `.dark` block + `@custom-variant dark` were removed (ADR-004)

## shadcn / Base UI Components
- Style is `base-vega` (configured in `components.json`). Every component re-exports a Base UI primitive (`@base-ui/react`) wrapped with Tailwind classes.
- Base UI uses the `render` prop instead of Radix's `asChild`:
  ```tsx
  // NOT: <Button asChild><Link href="/foo">Open</Link></Button>
  <Button render={<Link href="/foo" />}>Open</Button>
  ```
- Base UI's `Button` has a `nativeButton` prop. The shadcn wrapper at `components/ui/button.tsx` auto-sets `nativeButton={false}` when `render` is provided, so passing `<a href="...">` doesn't warn.
- Coss UI was installed and then removed (see ADR-004). Don't add `@coss/*` from any registry.
- Some primitives still copied from `/Users/darshan/Development/greek_os/components/ui` and not from the registry: none currently — all base components come from shadcn's `base-vega` style.

### Base UI gotchas
- `DropdownMenuLabel` MUST live inside a `DropdownMenuGroup` (Radix tolerated bare labels; Base UI throws "MenuGroupRootContext is missing").
- `<CommandDialog>` needs an internal `<Command>` wrapper for cmdk — the registry block ships without it; we patched `components/ui/command.tsx` to include it.
- `Select.SelectValue` renders the raw value by default, not the SelectItem's text. For filter dropdowns we put `<span>{labelForValue(value)}</span>` inside `SelectTrigger` directly instead of `<SelectValue/>`.

## Security Architecture

### Three Layers of OTP Freshness Enforcement (ADR-008)

OTP re-verification (60-day window) is enforced at three independent layers to prevent bypassing via direct API calls:

1. **`proxy.ts`** — redirects stale sessions away from dashboard URLs at the edge (fastest, catches most users)
2. **`app/(dashboard)/layout.tsx`** — server-side gate on layout render (catches dashboard-only routes)
3. **`requireApprovedAuth()`** — API routes throw if session is stale (cannot be bypassed, new 2026-05-14)

All three read from `isOTPVerificationRequired()` in `lib/auth.ts`, so changing `OTP_VALIDITY_DAYS` updates all three automatically. Never call the weaker `requireAuth()` on a data route; always use `requireApprovedAuth()`.

### Cross-Org Resource Isolation (ADR-009)

Non-NAPA users can only access their own org's resources via these mechanisms:

- Service layer filtering: `getResources()` and `getResourceById()` filter by org
- Permission checks: `canViewResource()`, `canEditResource()`, `canDeleteResource()`, `canDownloadResource()` enforce org membership
- List endpoints: `/api/v2/sidebar-badges`, `/api/v2/resources`, etc. apply org-scoping for non-NAPA users
- Detail endpoints: return `null` (not 403) for cross-org lookups to avoid ID enumeration attacks

The `allowDownload` flag on resources is now enforced: a resource can be visible but un-downloadable if the flag is false. Non-owner-org users respect this; owner-org admins always can download.

### Rate Limiting

BetterAuth rate limiting in `lib/auth.ts` protects auth endpoints from brute force:

```ts
customRules: {
  '/sign-in/email': { window: 60, max: 5 },
  '/email-otp/send-verification-otp': { window: 60, max: 3 },
  '/email-otp/verify-otp': { window: 60, max: 10 },
  '/forget-password': { window: 60, max: 3 },
}
```

This prevents 6-digit OTP brute-forcing (max 3 sends/minute, max 10 verify attempts/minute). The custom signup route at `/api/v2/auth/signup` is NOT covered by BetterAuth's limiter — if signup abuse becomes a problem, add a per-IP throttle there.

### File Upload Validation

- **Magic bytes**: Server validates actual file type (not client-supplied MIME type), preventing Content-Type mismatch attacks
- **Whitelist**: Only `ALLOWED_MIME_TYPES` from `lib/file-validation.ts` are accepted
- **Size limit**: 50MB max per file
- **Filename sanitization**: Removes special chars and path-traversal sequences
- **Storage**: Files stored in private Cloudflare R2 bucket; served via signed URLs from `/api/v2/resources/[id]/serve` (5-min TTL)

### NAPA Email Domain

`@napahq.org` and `@napa-online.org` emails are recognized at signup but:
- **Do NOT auto-approve** the account
- **Do NOT grant platform admin powers** automatically
- **Only set organizationName** to NAPA and `isAdmin = true` in that org
- **Still require Board approval** like any other user
- **Still require role grant** (`napaBoard` / `napaDirector`) from an existing Board member

This prevents fake-email auth bypass attacks.

## Neon Branches

| Branch | Host | Purpose |
|---|---|---|
| `development` | `ep-icy-rain-ah1oudbm-pooler.c-3.us-east-1.aws.neon.tech` | Local dev + team testing |
| `main` | `ep-holy-resonance-ahbkvl60-pooler.c-3.us-east-1.aws.neon.tech` | Production (Vercel) |

Both branches were truncated and re-seeded on 2026-06-06 with identical 2025+2026 data. The `development` branch is referenced in `.env.local`; the `main` branch URL is in `.env.vercel`.

When applying a schema migration, apply it to **both** branches. It is easy to miss the second branch — check both after any `drizzle-kit generate` run.

## Org Name Convention

Organization names are stored in **short form** — the colloquial name without the legal suffix. See ADR-010.

| Stored (correct) | Do NOT store |
|---|---|
| `alpha Kappa Delta Phi` | `alpha Kappa Delta Phi International Sorority, Inc.` |
| `Delta Epsilon Psi` | `Delta Epsilon Psi National Fraternity, Inc.` |
| `National APIDA Panhellenic Association` | (no change — no suffix to strip) |

`organization_name` is used as a text FK throughout the schema. A format mismatch causes FK violations on insert. Any incoming data (CSV, webhook, manual entry) must be normalized to the short form before writing.

## NAPA Board/Director — Null `organizationName` in Session

NAPA Board and Director users promoted manually (via `/admin/users` role grant after signup) may have `organizationName = null` in their BetterAuth session token, even though the DB row has the correct org. This happens because the session token is written at signup, before promotion.

**Pattern:** wherever client code needs the org name for a NAPA admin, fall back to `NAPA_ORG_NAME`:

```ts
const isNapaAdmin = user?.role === 'napaBoard' || user?.role === 'napaDirector'
const organizationName = user?.organizationName ?? (isNapaAdmin ? NAPA_ORG_NAME : null)
```

Applied in: `app/(dashboard)/page.tsx` and `app/(dashboard)/admin/org-users/page.tsx`.

## Conventions
- **API routes**: always under `app/api/v2/`. All protected routes must call `requireApprovedAuth()` at the top (not the weaker `requireAuth()`). Cast `session.user` to `ExtendedUser` (or `SessionUser`) since BetterAuth's default user type is missing our custom fields. Map error messages to HTTP status: `'Unauthorized'` → 401, everything else → 403.
- **File icons**: `@phosphor-icons/react` with `weight="duotone"`; look up via `FILE_ICON_MAP` in `lib/file-icons.ts`. All other icons use `lucide-react`.
- **Forms / resource actions**: centered `<Dialog>`. Sheet is reserved for non-form side panels.
- **Resource row clicks**: open `ResourceDetailDialog` rather than navigating to `/resources/[id]`. The dedicated detail route is retained only for direct URL access.
- **Toasts**: `sonner`.
- **Search debounce**: 200–300ms via `useDebouncedCallback`.
- **Tables**: every list page uses `<Table>` wrapped in `<div className="rounded-lg border bg-card overflow-hidden">`. Pagination via `<TablePagination>` from `components/ui/table-pagination.tsx` when there are many rows. The Resources table uses manual `useState` sort; admin tables get optional pagination only.
- **Date-only fields**: meeting dates and dues payment dates are date-only timestamps. Render with `formatDateOnly()` from `lib/format.ts` (UTC-safe). Real timestamps (createdAt, etc.) use `toLocaleDateString()` normally.
- **Org URLs**: `/org/<slug>` where `<slug>` is `orgSlug(orgName)`. The legacy `/admin/organizations/[name]` path is a redirect to the new route.
- **Responsive layout (ADR-011)**: headers stack with `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`; button groups add `flex-wrap`. `DialogContent` width caps are **always** `sm:max-w-*`, never bare `max-w-*` (a bare cap breaks the mobile gutter). Tables cap+wrap the one flexible text column (`max-w-[200px] sm:max-w-sm md:max-w-md whitespace-normal` + `line-clamp-1 break-words`) and hide low-priority columns with `hidden sm:table-cell` / `hidden md:table-cell` on both `TableHead` and `TableCell`. The mobile nav hamburger is the `SidebarTrigger` in `TopNav` (`md:hidden`); desktop uses the sidebar rail.
- **Role / status badges**: role pills use the color scheme NAPA Board = `bg-primary/10 text-primary` (gold), NAPA Director = purple, Admin = sky, Member/User = muted. Reuse `roleSelectValue()` in `OrgUsersClient.tsx` (or the inline `getRoleBadge` in `/admin/users`) so the pill always matches the edit dropdown. Status pills: Approved = green, Pending = yellow, Rejected/Banned = red. The "NEW" resource pill and sidebar count badge use `bg-primary text-primary-foreground` (gold).
- **`/admin/users` (All Users)** now **includes** NAPA-org and Board/Director users; they are always sorted to the bottom of the list (NAPA org sinks last regardless of sort field/direction). Do not re-add a `!== NAPA_ORG_NAME` exclusion.
- **Meetings page** has a **year dropdown** that filters the table, CSV export, and empty state. Years are derived from the data plus the current year (`new Date().getFullYear()`), newest first.

## Org Health Scoring
5 dimensions, each 0–20 pts. Baseline 16 per dimension when nothing is measured/recorded yet, so an empty org starts at 80. Full completion brings each to 20 (max 100). See ADR-006.

| Dimension | 20 (full) | Partial | 0 |
|---|---|---|---|
| Monthly meetings | avg credit across **past** meetings × 20 (2+ attendees = 1.0, 1 = 0.5) | — | all past had 0 attendees |
| NAPAAM | 2+ attendees | 10 (1 attendee) | 0 attendees after event date |
| Renewal & Cert | completed | — | not completed (baseline 16) |
| Dues | fully paid | 10 (partial) | unpaid (baseline 16) |
| 1×1 with NAPA | completed | — | not completed (baseline 16) |

Future-dated meetings show in the `X/12` display but don't affect the score until they happen.

## Dead Files (post-2026-05 cleanup)
- `components/AdminLayout.tsx`, `AppHeader.tsx`, `Footer.tsx`, `layout/Sidebar.tsx` — deleted
- `components/ThemeToggle.tsx`, `NotificationBell.tsx` — deleted (sidebar badges + NEW pill replace them)
- `lib/services-drizzle/domain-whitelist.ts` — deleted along with the domain whitelist feature
- `/admin/organizations/[name]/page.tsx` — now a redirect stub; real page is `/org/[slug]`

## Platform Due Dates

`platform_dues_targets` now has three nullable timestamp columns (migration `0009`, added 2026-06-06):
- `dues_due_date` — when dues must be paid by (2026: Oct 15)
- `renewal_due_date` — when renewal + cert must be completed (2026: Jun 14)
- `one_on_one_due_date` — when the 1×1 meeting must occur (2026: Sep 30)

These are set per-year by NAPA Board. 2025 has no due dates set (nulls). 2026 has all three populated.

UI for editing due dates on the org-health page is **not yet built** — planned for the next session.

## Open Work
- **Forms integration** (Fillout + Google Forms): full plan written in `.claude/plans/floofy-petting-dusk.md`. 9 new files + 4 modified. Not started yet.
- **Due date UI on org-health page**: Board should be able to set/edit `dues_due_date`, `renewal_due_date`, `one_on_one_due_date` per year from the portal. Schema columns exist; API and UI not built.
- **QBO integration**: Read-only automated sync of invoices/payments from NAPA's single QuickBooks Online account. NAPA-side only.
- File preview for office docs (PDFs already open in-browser via signed URL; .docx/.xlsx/.pptx would need an Office Online Viewer wrapper)
- Per-meeting CSV attendance import on the meeting detail page

Done 2026-07-06 (no longer open): mobile/responsive pass across all pages (ADR-011); Org Users status column; NAPA users included in All Users; meetings year filter; user-id column drift fixed (ADR-012).
