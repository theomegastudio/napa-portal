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
1. Signup → `status = 'pending'`
2. Admin approves → `status = 'approved'`
3. Email OTP re-verification required every 60 days (`isOTPVerificationRequired`)
4. `@napahq.org` / `@napa-online.org` emails are placed in the NAPA org and get `isAdmin = true` automatically. `role` stays `user` until manually promoted to `napaBoard` / `napaDirector` by an existing Board member.
5. Session cookie: `better-auth.session_token` (prod: `__Secure-better-auth.session_token`)

## Key Files
| File | Purpose |
|------|---------|
| `proxy.ts` | Next.js 16 middleware — MUST be `proxy.ts` (v16 naming); auth gate, redirects unauthenticated to /login |
| `lib/auth.ts` | BetterAuth config: emailOTP, drizzle adapter, bcrypt |
| `lib/auth-helpers.ts` | `requireAuth`, `requireApprovedAuth`, `AuthUser` shape with role flags |
| `lib/auth-client.ts` | Client auth hooks: `useSession`, `signOut`, `isOTPVerificationRequired` |
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
# 3. Apply manually (the project doesn't use drizzle-kit migrate directly because
#    DATABASE_URL isn't loaded automatically by it). Use a node one-liner:
set -a; source .env.local; set +a
node -e "
  const { Client } = require('pg');
  // ... run the ALTER/CREATE statements ...
  // ... then INSERT INTO drizzle.__drizzle_migrations VALUES (hash, Date.now()) ...
"
```

The legacy `scripts/migrate.mjs` is no longer used.

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

## Conventions
- **API routes**: always under `app/api/v2/`. Auth check at the top of every handler. Cast `session.user` to `ExtendedUser` (or `SessionUser`) since BetterAuth's default user type is missing our custom fields.
- **File icons**: `@phosphor-icons/react` with `weight="duotone"`; look up via `FILE_ICON_MAP` in `lib/file-icons.ts`. All other icons use `lucide-react`.
- **Forms / resource actions**: centered `<Dialog>`. Sheet is reserved for non-form side panels.
- **Resource row clicks**: open `ResourceDetailDialog` rather than navigating to `/resources/[id]`. The dedicated detail route is retained only for direct URL access.
- **Toasts**: `sonner`.
- **Search debounce**: 200–300ms via `useDebouncedCallback`.
- **Tables**: every list page uses `<Table>` wrapped in `<div className="rounded-lg border bg-card overflow-hidden">`. Pagination via `<TablePagination>` from `components/ui/table-pagination.tsx` when there are many rows. The Resources table uses manual `useState` sort; admin tables get optional pagination only.
- **Date-only fields**: meeting dates and dues payment dates are date-only timestamps. Render with `formatDateOnly()` from `lib/format.ts` (UTC-safe). Real timestamps (createdAt, etc.) use `toLocaleDateString()` normally.
- **Org URLs**: `/org/<slug>` where `<slug>` is `orgSlug(orgName)`. The legacy `/admin/organizations/[name]` path is a redirect to the new route.

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

## Open Work
- File preview for office docs (PDFs already open in-browser via signed URL; .docx/.xlsx/.pptx would need an Office Online Viewer wrapper)
- Mobile-specific table layout for narrow screens
- Per-meeting CSV attendance import on the meeting detail page
