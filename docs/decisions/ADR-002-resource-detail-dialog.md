# ADR-002: Resource Detail as Dialog Instead of Route

**Status:** Accepted
**Date:** 2026-05-12
**Deciders:** Engineering

## Context

The initial implementation placed resource detail at `/resources/[resourceId]` — a full-page route. Navigating to a resource triggered a full page transition, cleared list state, and required the user to navigate back to return to their previous position in the list.

The product requirement was for resources to "pop up" when clicked without a full page transition. Resource detail content is compact (title, description, metadata, action buttons) and fits well in a modal.

## Decision

Replace primary navigation with a `ResourceDetailDialog` component rendered inline on the list page.

- `ResourceTable` accepts an optional `onRowClick` prop. When provided, clicking a title or "View Details" invokes the callback and opens the dialog. When omitted, it falls back to link navigation — keeping the component reusable.
- `ResourceDetailDialog` fetches its own data on open via `GET /api/v2/resources/[id]`, keeping it self-contained.
- The `/resources/[resourceId]` page route is retained for direct URL access and deep linking.
- `canManage` is derived in the parent page and passed as a prop, avoiding a redundant session fetch inside the dialog on every open.

## Consequences

### Positive

- No full page reload — list scroll position and filters are preserved
- Sequential review of multiple resources is faster
- Deep links continue to work via the retained route

### Negative / Trade-offs

- Dialog holds its own fetch state, duplicating data that may already be in the list response
- Dialog experience (overlay) and direct URL experience (full page) are visually different
- Changes to resource detail must be reflected in both `ResourceDetailDialog` and `/resources/[resourceId]/page.tsx`
