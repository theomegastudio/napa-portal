# ADR-003: proxy.ts as Middleware Entry Point (Next.js 16)

**Status:** Accepted
**Date:** 2026-05-12
**Deciders:** Engineering

## Context

Next.js 16 renamed the middleware convention from `middleware.ts` to `proxy.ts`. During the transition, both files existed simultaneously, causing duplicate middleware execution and unpredictable auth redirect behavior.

Auth session checking was also duplicated between the middleware layer and the dashboard layout server component with no clear ownership of which was authoritative.

## Decision

Delete `middleware.ts`. Use `proxy.ts` exclusively as required by Next.js 16.

Auth gate logic is maintained at two layers with distinct responsibilities:

**`proxy.ts` (edge):** Fast cookie presence check. Redirects unauthenticated requests to `/login` immediately at the edge before any server rendering. Maintains `PUBLIC_PATHS` array for routes that bypass the check.

**`app/(dashboard)/layout.tsx` (server component):** Full DB-backed session validation including approval status and OTP validity (60-day re-verification requirement). Authoritative source for business-level access control.

This two-layer design is intentional, not redundant — the edge layer cannot access the database, and the layout runs too late for cheap early rejection of unauthenticated traffic.

## Consequences

### Positive

- Single clearly-named entry point aligned with Next.js 16 convention
- Fast-path rejection at edge reduces unnecessary server rendering
- Clean separation: cookie check at edge, business logic in layout

### Negative / Trade-offs

- Auth rules span two files — changes may require updates in both `proxy.ts` and the layout
- `PUBLIC_PATHS` in `proxy.ts` must be kept in sync with any new public routes; omitting a path will incorrectly redirect unauthenticated users
