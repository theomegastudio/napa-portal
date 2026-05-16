# ADR-009: Conservative Cross-Org Resource Isolation

**Status:** Accepted
**Date:** 2026-05-16
**Deciders:** Engineering, Security

## Context

NAPA Resource Hub is a multi-tenant app where member organizations upload and share resources. Permissions must be enforced carefully:

- **NAPA staff** (napaBoard, napaDirector) should see **all orgs' resources**
- **Org members** should see **only their own org's resources**
- **Org admins** should be able to **edit/delete only their own org's resources**

Until 2026-05-14, several endpoints were missing these checks:

1. `getResources()` listed all non-deleted resources regardless of the user's org
2. `getResourceById()` returned cross-org resources to non-NAPA users (information disclosure)
3. `updateResource()` allowed org admins to edit resources from other orgs
4. `deleteResource()` allowed org admins to delete resources from other orgs
5. `/api/v2/sidebar-badges` leaked pending-approval counts and new-resource counts across orgs to non-NAPA users

## Decision

Implement **conservative cross-org isolation** using permission helpers from `lib/permissions.ts`:

- `canViewResource(user, resourceOrg)` — true for NAPA staff or if user's org matches
- `canEditResource(user, resourceOrg)` — true for NAPA staff or for org admin of the resource's org (NOT global admin)
- `canDeleteResource(user, resourceOrg)` — true for org admin only (NAPA staff intentionally excluded)
- `canDownloadResource(user, resourceOrg, allowDownload)` — respects per-resource `allowDownload` flag

### Service Layer Enforcement

**File: `lib/services-drizzle/resources.ts`**

- `getResources()`: Now filters by `eq(resources.organization, user.organizationName)` for non-NAPA users
- `getResourceById()`: Returns `null` if the user cannot view that org (not throwing; mimics "not found")
- `updateResource()`: Calls `canEditResource(user, existing.organization)` and throws if false
- `deleteResource()`: Calls `canDeleteResource(user, existing.organization)` and throws if false

**File: `app/api/v2/resources/[id]/serve/route.ts`**

- Added `canDownloadResource(user, resource.organization, resource.allowDownload ?? false)` check
- Throws 403 if the user cannot download (either not approved, cross-org, or `allowDownload = false`)
- Returns 500 on signed-URL generation failure (was: falls back to raw R2 URL, which could be public)

**File: `app/api/v2/admin/org-leaders/route.ts`**

- GET endpoint now checks that user is NAPA staff OR org admin (was: accepting any authenticated user)
- POST endpoint already had this check; GET mirrors it for consistency

**File: `app/api/v2/sidebar-badges/route.ts`**

- Org-scoped `approvalsCount` for non-NAPA users (was: leaking global count)
- Org-scoped `newResourcesCount` for non-NAPA users (consistency with H2)
- NAPA staff see all-org counts; org members see only their own org

### Permission Helper Pattern

```ts
import {
  canViewResource, canEditResource, canDeleteResource,
  canDownloadResource
} from '@/lib/permissions'

// Check before returning data
const resource = await getResourceById(id)
if (!canViewResource(user, resource.organization)) {
  return null // Not found (hide existence)
}

// Check before allowing write
if (!canEditResource(user, resource.organization)) {
  throw new Error('Unauthorized: Cannot edit resources from another organization')
}
```

## Consequences

### Positive

- Cross-org data is no longer visible or modifiable by non-NAPA users (even if they have `isAdmin = true`).
- NAPA staff can still manage all resources; they're not locked out of their own oversight operations.
- Org admins can't accidentally or maliciously edit a resource they don't own, even if it has the same name.
- The `allowDownload` flag now works correctly: a resource can be visible but un-downloadable.
- Single source of truth: permission logic lives in `lib/permissions.ts` and is tested in one place.

### Negative / trade-offs

- `getResourceById()` returns `null` for cross-org lookups (mimics "not found"), which hides the existence of other orgs' resources from enumeration. If an attacker knows the exact UUID, they still get a 404-like response instead of a 403. This is intentional (conservative); we'd switch to explicit 403 if a use case required it.
- Org admins must be flagged at the **service layer** (`canEditResource` checks org membership), not the **API layer** (`requireAdmin()` alone). This is a code-review discipline: any route that edits a resource must call the permission helper.
- The permission helpers are `async function` (they don't hit the DB but match the pattern), so callsites must `await`.

## Anti-Pattern: Global `isAdmin`

Do NOT do this:
```ts
// ❌ WRONG: org admins from other orgs can edit
if (!user.isAdmin) {
  throw new Error('Admin only')
}
// ...edit resource from org B...
```

Instead:
```ts
// ✅ CORRECT: only org admins of the resource's org can edit
if (!canEditResource(user, resource.organization)) {
  throw new Error('Unauthorized')
}
```

## Future Work

- Add `canArchiveResource()` helper for consistency (currently only org admins can archive; should be explicit)
- Consider adding a `reportedBy` column to track which org/user reported a security issue (for audit)
