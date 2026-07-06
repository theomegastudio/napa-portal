# ADR-011: Responsive Layout Patterns for Small Screens

**Status:** Accepted
**Date:** 2026-07-06
**Deciders:** Engineering

## Context

The app was built desktop-first and several pages were unusable below ~768px:

1. **No mobile navigation.** The sidebar (`components/ui/sidebar.tsx`) switches to an off-canvas `Sheet` on mobile (`isMobile` → `openMobile`), but nothing on the page rendered a `SidebarTrigger`. Small-screen users had **no way to open the nav at all**.
2. **Table horizontal blowout.** `TableCell` defaults to `whitespace-nowrap`. The Resources table rendered a long, un-wrapped `description` in the title cell, which expanded the table far past the viewport and pushed every other column behind a horizontal scrollbar.
3. **Toolbar headers overflowed.** Page headers used `flex items-center justify-between` with a title plus 2–3 action buttons and no wrapping/stacking.
4. **Full-bleed dialogs.** Several `DialogContent` used an **unprefixed** `max-w-*` (e.g. `max-w-2xl`), which tailwind-merge lets override the base dialog's mobile safety cap `max-w-[calc(100%-2rem)]`, removing the side gutters on phones.
5. **Fixed-width form/OTP controls** (e.g. 6× `w-12` OTP boxes) overflowed their card.

## Decision

Adopt a small set of repeatable responsive patterns. Apply them to every list/detail/form page; do not invent per-page variants.

### 1. Mobile nav trigger lives in `TopNav`

`components/layout/TopNav.tsx` renders a `SidebarTrigger` (+ vertical `Separator`) gated `md:hidden`. Desktop keeps using the sidebar's collapse rail; mobile gets the hamburger that opens the off-canvas sheet. **Any layout with a collapsible sidebar must expose a trigger somewhere the user can reach on mobile.**

### 2. Tables: wrap the flexible text column, progressively hide low-priority columns

- The one flexible text column (title + description) is width-capped and allowed to wrap so `line-clamp` truncates instead of expanding the table:
  `className="max-w-[200px] sm:max-w-sm md:max-w-md whitespace-normal"` on the cell, `line-clamp-1 break-words` on the text.
- Low-priority columns are hidden on narrow screens with `hidden sm:table-cell` / `hidden md:table-cell` on **both** the `TableHead` and the matching `TableCell`. On a phone the Resources table shows icon + Title + actions; Organization appears at `sm`, Type/Added at `md`. Nothing is lost — hidden fields still show in the row's detail dialog.

The shared `Table` wrapper (`components/ui/table.tsx`) already provides `overflow-x-auto`, so any table that genuinely must stay wide will scroll rather than break the page. Column-hiding is for readability, not to prevent breakage.

### 3. Headers stack, button groups wrap

Toolbar headers use:
`className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"`
and multi-button groups add `flex-wrap`. Long titles next to actions get `min-w-0` (title) + `shrink-0` (buttons).

### 4. Dialogs are always `sm:`-prefixed

`DialogContent` width caps must be `sm:max-w-*`, never bare `max-w-*`, so the base `max-w-[calc(100%-2rem)]` mobile gutter applies. This is a hard rule — an unprefixed cap is a bug.

### 5. Fixed-width inputs get responsive sizes

Fixed-width control clusters (OTP boxes, inline edit strips) either use responsive sizes (`w-10 h-12 sm:w-12 sm:h-14`) or wrap (`flex-wrap`).

### 6. Main content padding

Dashboard `main` uses `p-4 sm:p-6` to reclaim ~16px/side on phones.

## Consequences

### Positive

- Every dashboard and auth page is usable at ~375px.
- The patterns are copy-paste; a reviewer can spot a violation by eye (bare `max-w-`, a `justify-between` header with no `flex-col`, a nowrap flexible table column).

### Negative / trade-offs

- **No enforcement.** These are conventions, not lint rules. A new page can reintroduce any of the failures. A future `eslint` rule (e.g. flag `DialogContent` with unprefixed `max-w-`) would help.
- **Column-hiding is manual.** Each table decides its own breakpoints; there's no generic "responsive columns" abstraction. Acceptable given only a few tables.
- Progressive column hiding means a phone user must open the detail dialog to see Type/Org/Added — a deliberate trade of density for legibility.

## References

- Fixed in commits during the 2026-07-06 session. Files: `components/layout/TopNav.tsx`, `app/(dashboard)/layout.tsx`, `components/ResourceTable.tsx`, and header/dialog fixes across admin pages, `org/[slug]`, `profile`, `signup`, `verify-email`.
