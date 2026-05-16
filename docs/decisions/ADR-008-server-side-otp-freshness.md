# ADR-008: Server-Side OTP Freshness Enforcement

**Status:** Accepted
**Date:** 2026-05-16
**Deciders:** Engineering, Security

## Context

Until 2026-05-14, OTP re-verification (the 60-day re-check that users must pass every 60 days) was enforced at the **UI layer only**:

1. `proxy.ts` middleware redirected dashboard navigation to `/verify-email` if the session was stale
2. `app/(dashboard)/layout.tsx` server-rendered a gate that blocked the layout if stale

However, users could **bypass the UI gate by directly calling `/api/v2/*` data routes**. A user with a 61-day-old session could still:

- Fetch resources via `/api/v2/resources`
- Download files via `/api/v2/resources/[id]/serve`
- Modify resources, create meetings, edit org settings, etc.

This is a **session security issue** — the UI and API layers had inconsistent trust boundaries.

## Decision

Move OTP freshness enforcement from UI-only to the **server API layer**. All protected data routes now call `requireApprovedAuth()`, which validates two conditions:

1. `user.approvalStatus === 'approved'` (was already checked)
2. `user.emailVerificationRequired === false` (NEW — checks session age via `isOTPVerificationRequired()`)

If the session is older than 60 days, the user is treated as not-authenticated: the route returns `403` with message "OTP verification required."

### Changes

**File: `lib/auth-helpers.ts`**
```ts
export async function requireApprovedAuth(): Promise<AuthUser> {
  const user = await requireAuth();

  if (user.approvalStatus !== 'approved') {
    throw new Error('Account not approved');
  }

  if (user.emailVerificationRequired) {
    throw new Error('OTP verification required');
  }

  return user;
}
```

**File: `app/api/v2/upload/route.ts`**
```ts
export async function POST(request: NextRequest) {
  try {
    await requireApprovedAuth(); // ← enforces OTP freshness
    // ...
  }
}
```

Similar pattern applied to:
- `/api/v2/resources/[id]/serve`
- `/api/v2/sidebar-badges`
- All other data routes that already call `requireApprovedAuth()`

### Three Layers of Enforcement

Now there are three independent layers (keeping them all in sync is important):

1. **`proxy.ts` middleware** — redirects stale sessions away from dashboard URLs at the edge (fast path for UI)
2. **`app/(dashboard)/layout.tsx`** — server-side gate on layout render (covers new protected routes added to the dashboard)
3. **`requireApprovedAuth()` in `lib/auth-helpers.ts`** — throws on API routes if session is stale (covers all `/api/v2/*` calls, cannot be bypassed)

**Key invariant:** All three read from `isOTPVerificationRequired()` in `lib/auth.ts`, so changing `OTP_VALIDITY_DAYS` updates all three.

## Consequences

### Positive

- OTP re-verification is now **cryptographically enforced** at the API boundary. Sessions older than 60 days cannot access any protected data, even via direct API calls.
- Consistent security posture: UI and API share the same trust boundary.
- No special-casing needed per route; all routes that call `requireApprovedAuth()` get the check for free.
- The 60-day window is defined in one place (`lib/auth.ts`).

### Negative / trade-offs

- Session state is now checked twice on dashboard navigation: once at the edge (proxy.ts) and once on layout render. The second check is cheap (in-memory, no DB call) so latency impact is negligible.
- Developers must remember that **all `/api/v2/*` routes require `requireApprovedAuth()`**, not just `requireAuth()`. This is a code-review rule.
- API routes that were calling the weaker `requireAuth()` but should call `requireApprovedAuth()` will be caught by runtime testing and type narrowing, but static analysis would be stricter.

## Decision: Distinct Error Messages

The three error cases thrown by `requireApprovedAuth()` have distinct messages so callers can map them to the correct HTTP status:

- `"Unauthorized"` → 401 (no session)
- `"Account not approved"` → 403 (pending or rejected)
- `"OTP verification required"` → 403 (session stale, needs re-verify)

Callers map these via:
```ts
if (msg === 'Unauthorized') {
  return NextResponse.json({ error: msg }, { status: 401 });
} else {
  return NextResponse.json({ error: msg }, { status: 403 });
}
```
