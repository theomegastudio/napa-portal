# ADR-004: Migrate UI primitives from Radix to Base UI; remove Coss UI

**Status:** Accepted
**Date:** 2026-05-12
**Deciders:** Engineering

## Context

The project shipped with shadcn/ui in the `vega` style, built on Radix UI primitives. Two pressures pushed us off Radix:

1. Base UI (from the team behind Radix and MUI) reached GA, and shadcn officially supports a Base-UI-based style (`base-vega`) as of January 2026. Base UI fixes long-standing Radix API quirks (`asChild` → `render`, more accurate ARIA, simpler composition) and is the team's recommended forward path.
2. We wanted certain block patterns (sidebar-08 inset, frame-style tables) that the Vega registry didn't ship. Coss UI is a Base-UI-based component library with these blocks, and shadcn supports its registry.

We migrated to Base UI via the `base-vega` style. Then, after trying out `@coss/p-table-1`/`p-table-4` and `@coss/card` (`CardFrame`), we removed Coss because:
- The Coss tables use `Table variant="card"` with subtle frame styling that visually clashed with the rest of the app's plain `rounded-lg border bg-card` look.
- The Coss `Pagination` component renders prev/next with arrow-only icons whose disabled state was hard to read.
- `p-table-4` pulled in `@tanstack/react-table`. A few days later TanStack had an npm supply-chain incident; we removed it out of caution and rebuilt sort+pagination on plain React state.

## Decision

- Adopt **Base UI** as the primitives library. Move `components.json` `style` from `vega` to `base-vega`. Reinstall all primitives that import from Radix.
- Replace every `asChild` call site with `render={<...>}` (Base UI's API).
- Wrap shadcn's `Button` to auto-set `nativeButton={false}` when `render` is provided so passing `<a>` doesn't warn.
- Remove `@coss/*` from `components.json` registries. Replace `CardFrame` / `<Table variant="card">` / Coss `Pagination` with plain shadcn equivalents:
  - Tables sit in `<div className="rounded-lg border bg-card overflow-hidden">`.
  - Sorting uses plain `useState`; pagination uses a small `<TablePagination>` component built on shadcn `<Button>` with chevron icons and clear disabled state.
- Remove dark mode. The `.dark` CSS block, `@custom-variant dark`, `ThemeProvider`, and `ThemeToggle` are all gone. App is light-only.

## Consequences

### Positive

- Single set of primitives (Base UI) across the app — no Radix/Base hybrid.
- Better keyboard a11y and consistent `render`-prop composition pattern.
- Pagination buttons clearly show enabled vs. disabled state.
- Simpler styling — every table looks the same.

### Negative / trade-offs

- One-time mechanical refactor: 24+ `asChild` sites needed conversion.
- Several Base UI behavior gotchas not present in Radix: `DropdownMenuLabel` must live inside `DropdownMenuGroup`; `<Command>` wrapper missing from registry's `CommandDialog`; `SelectValue` renders raw value rather than item text by default. These are documented in CLAUDE.md.
- Old screenshots and Radix-era examples online don't directly apply.
- If we ever want dark mode back, we'll have to redo the `.dark` block.
