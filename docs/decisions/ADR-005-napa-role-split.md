# ADR-005: Split napaAdmin into NAPA Board and NAPA Director

**Status:** Accepted
**Date:** 2026-05-12
**Deciders:** Engineering, Product

## Context

Until 2026-05 the platform had two role concepts:

1. `users.role` text column with values `'user'`, `'admin'`, `'napaAdmin'`.
2. `users.isAdmin` boolean for org-level admin (separate from `role`).

`napaAdmin` was a single platform-wide super-user role: full read+write across all orgs, plus user approvals, plus org CRUD. The product team wanted to give some NAPA staff (Directors) read+write access without granting them user-approval and org-management powers, and to gate Org Health visibility per-Director.

## Decision

Split the single `napaAdmin` role into two distinct roles plus a feature flag:

| Role | Capabilities |
|---|---|
| `napaBoard` | Everything `napaAdmin` had: read+write across orgs, approve users, grant/revoke roles, CRUD orgs, set the platform-wide dues target. Sees Org Health. |
| `napaDirector` | Read+write across orgs. Cannot approve users, cannot grant roles, cannot CRUD orgs. Sees Org Health **only when `users.can_view_org_health = true`**. |

Schema:
- Added `users.can_view_org_health boolean default false not null`.
- Migrated existing `role = 'napaAdmin'` users → `role = 'napaBoard'`.
- New permission helpers in `lib/permissions.ts`: `isNapaBoard`, `isNapaDirector`, `isNapaUser` (Board OR Director), `canViewOrgHealth`, `canApproveUsers`, `canManageRoles`, `canManageOrganizations`.
- `AuthUser` now exposes `isNapaBoard`, `isNapaDirector`, `canViewOrgHealth`. `isNapaAdmin` stays as an alias for `isNapaBoard || isNapaDirector` so existing call sites don't break.

UI:
- `/admin/users` edit dialog gets a NAPA-only Role selector (Board grants only). Director selection reveals a `canViewOrgHealth` checkbox.
- `/admin/org-users` invite + edit dialogs, when the org is the NAPA parent body, show the same Role selector instead of the org-level "Make Admin" checkbox.

Server enforcement:
- `updateUser` and `updateMemberRole` reject `role` changes from anyone but `napaBoard`.
- Granting `napaBoard` / `napaDirector` is only valid when the target user's org is `'National APIDA Panhellenic Association'`.

Sidebar / CommandSearch nav items got new gate flags:
- `napaBoardOnly` — Board only
- `napaAdminOnly` — Board or Director (existing meaning preserved)
- `orgHealthGated` — Board always; Director only when `canViewOrgHealth` is true

## Consequences

### Positive

- Directors can join NAPA workflows without being trusted with user/org admin operations.
- Per-Director Org Health gating supports tighter access control (some Directors run finance-adjacent work, others don't).
- Existing `isNapaAdmin` flag still does the right thing for the common "is this a NAPA staffer?" check.

### Negative / trade-offs

- More state to think about when reasoning about permissions. Always check `isNapaBoard` for write-sensitive ops and `canViewOrgHealth` for the metrics page.
- Sidebar gating flags are now four (`adminOnly`, `napaAdminOnly`, `napaBoardOnly`, `orgHealthGated`); contributors must register a page in both `AppSidebar.tsx` and `CommandSearch.tsx` with the same gate.
- The text column `role` lost its constraint to a fixed enum — we validate string values at the service layer instead. Worth pgEnum-ing if we add more roles.
