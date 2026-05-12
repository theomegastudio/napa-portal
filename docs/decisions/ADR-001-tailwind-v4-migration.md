# ADR-001: Tailwind CSS v4 Migration

**Status:** Accepted
**Date:** 2026-05-12
**Deciders:** Engineering

## Context

The project was running Tailwind CSS v3.4. The shadcn sidebar component (copied from another v4 project) used v4-only CSS variable shorthand syntax — e.g. `w-(--sidebar-width)` — which is not valid in v3. In v3, the sidebar gap div resolved to zero width, causing the fixed sidebar overlay to cover the main content area rather than push it aside.

Additionally, Turbopack was generating conflicts between the v3 PostCSS plugin and v4 library code present in the dependency tree, producing unreliable HMR behavior.

## Decision

Migrate the project to Tailwind CSS v4 with the following concrete changes:

- Replace the `tailwindcss` PostCSS plugin with `@tailwindcss/postcss`
- Replace `@tailwind base/components/utilities` directives with `@import "tailwindcss"` in `globals.css`
- Replace `tailwindcss-animate` with `tw-animate-css`
- Remove `autoprefixer` — v4 handles vendor prefixing internally
- Delete `tailwind.config.ts` and move all theme config into an `@theme inline { ... }` block in `globals.css`
- Add `@custom-variant dark (&:is(.dark *))` for class-based dark mode
- PostCSS config must be `postcss.config.js` (CJS). Turbopack ignores `.mjs` files in projects without `"type": "module"` in `package.json`

## Consequences

### Positive

- CSS variable shorthand (`w-(--sidebar-width)`) works natively — sidebar layout renders correctly
- Configuration is colocated in one file (`globals.css`) rather than split across `tailwind.config.ts` and CSS
- `autoprefixer` is no longer a separate managed dependency
- shadcn components copied from other v4 projects work without modification
- Turbopack build conflicts eliminated

### Negative / Trade-offs

- Online resources and AI-generated snippets commonly default to v3 patterns — must verify syntax applies to v4
- `@apply` still works but some v3 plugin utilities behave differently in v4
- Irreversible for this project without manually undoing all changes
