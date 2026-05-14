# ADR-007: Self-service organization detail page at /org/[slug]

**Status:** Accepted
**Date:** 2026-05-13
**Deciders:** Engineering, Product

## Context

Org Health is NAPA-staff-only. But individual member orgs wanted to see their own engagement score, leaders/contacts on file, and meeting attendance history without depending on NAPA to send screenshots. Three constraints:

1. Org members shouldn't see other orgs' data.
2. Org admins should be able to edit their own org's leaders + contacts.
3. NAPA staff should see the same page for any org (no duplicate UI).
4. URLs should be readable — `Alpha%20Kappa%20Delta%20Phi` was ugly.

The old `/admin/organizations/[name]` page lived under the `/admin` route group, which requires `isAdmin || isNapaAdmin` to render. Reusing it for org members would mean weakening the admin gate — a smell.

## Decision

- Move the org detail page out of `/admin` to `/org/[slug]` (a non-admin route group).
- `[slug]` is a kebab-case slug derived from the org name via `lib/slug.ts` `orgSlug(name)`. The page matches both the slug AND the exact name so legacy `%20`-encoded URLs continue to work.
- The legacy path `/admin/organizations/[name]/page.tsx` becomes a server-side redirect (slugify the param + `redirect()` to `/org/[slug]`).
- API endpoint `/api/v2/org/[slug]` handles all permissioning server-side:
  - NAPA Board / Director (`isNapaAdmin`) — read any org.
  - Org members (`user.organizationName === org.organizationName`) — read their own org.
  - Anyone else → 403.
- The response includes a `permissions` object: `{ canEditLeaders, isNapa, isOwnOrg }`. The page hides leader edit controls when `canEditLeaders` is false.
- `org_leaders` gets a nullable `year` column. Leaders can be tagged with the term year; null means "ongoing." The detail page filters by selected year and shows ongoing leaders in every year's view with an "Ongoing" badge.
- A new "Our Organization" sidebar item appears for users with a non-NAPA `organizationName`, pointing at their own `/org/<slug>`.

## Consequences

### Positive

- Single page serves both NAPA and member views; no duplicate UI to maintain.
- Org admins can manage their own leader list without NAPA intervention.
- Year-tagged leaders preserve history as positions change annually.
- Readable URLs (`/org/alpha-kappa-delta-phi`).

### Negative / trade-offs

- Permission logic lives in the API route, not at the layout level. A future contributor adding a similar self-service page needs to remember to re-implement the org-scoping check; we don't have a layout-level wrapper for "own org only" yet.
- Slug collisions are theoretically possible if two org names slugify to the same value (e.g. "Foo Bar" and "Foo-Bar"). Today org names are unique enough that this isn't a real risk, but if it ever becomes one, we'd need to store the slug on the row and enforce uniqueness.
- Leaders shown across all years (year=null) are convenient but could surprise users who expect strict per-year filtering. The "Ongoing" badge signals it; if that becomes confusing we can drop the union and force year-specific entries only.
