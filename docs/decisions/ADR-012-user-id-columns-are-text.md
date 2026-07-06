# ADR-012: User-Identifying Columns Must Be `text`, Not `uuid`

**Status:** Accepted
**Date:** 2026-07-06
**Deciders:** Engineering

## Context

BetterAuth generates **text** primary keys for `users.id` (`id: text('id').primaryKey()` — see the schema comment "BetterAuth uses text IDs"). These ids are short random strings (e.g. `seed-finance-napahq-org`, and real BetterAuth ids like `xY3k...`), **not** UUIDs.

Every column that stores a user id therefore must also be `text`. The Drizzle schema already declares them correctly:

- `audit_logs.user_id` → `text('user_id')`
- `resource_versions.updated_by_user_id` → `text('updated_by_user_id')`
- `resources.uploaded_by` → `text('uploaded_by')`

However, the **live databases had drifted**: `audit_logs.user_id` and `resource_versions.updated_by_user_id` were physically `uuid` on both Neon branches, despite the schema saying `text`. This produced runtime failures that only surfaced on write:

- Creating a resource → insert into `audit_logs` → `invalid input syntax for type uuid: "seed-finance-napahq-org"` (Postgres `22P02`).
- Editing a resource → insert into `resource_versions` → same error on `updated_by_user_id`.

Because the failure is on a **non-UUID user id**, it would break these writes for *every* user, not just seeded ones.

Critically, **`drizzle-kit generate` did not catch this.** drizzle-kit diffs the schema against its own snapshot (`drizzle/meta/*_snapshot.json`), not against the live database. The snapshot already said `text`, so no migration was generated — the drift was invisible to the normal migration flow.

## Decision

1. **Any column that references a user id is `text`.** This includes `user_id`, `*_by`, `uploaded_by`, `updated_by_user_id`, `approved_by`, etc. Never `uuid`. UUIDs are only for surrogate PKs of app-owned tables (`resources.id`, `audit_logs.id`, …) that use `defaultRandom()`.

2. **Fix schema drift in-place with a type cast**, applied to **both** Neon branches:
   ```sql
   ALTER TABLE <table> ALTER COLUMN <col> TYPE text USING <col>::text;
   ```
   `uuid → text` is always safe (no data loss). This is a DB-only correction; no migration file or schema edit is needed because the schema was already correct.

3. **Do not "fix" the failing user row.** The instinct to edit the offending `users` row (e.g. give `finance@napahq.org` a UUID id) is wrong — it masks a column-type bug that affects all users and fights BetterAuth's id format.

## How this drift happened

The columns were most likely created as `uuid` in an early migration and later changed to `text` in the schema without a corresponding `ALTER` being applied to the live DBs (or applied to one branch only). Since drizzle-kit compares against the snapshot, the mismatch persisted silently until a write hit the column.

## Consequences

### Positive

- Audit logging on create and version tracking on edit work for all users on both branches.
- Documents a diagnostic: a `22P02 invalid input syntax for type uuid` on a `user_id`/`*_by` column means DB drift, fix the column type — not the row.

### Negative / trade-offs

- **Snapshot-vs-live drift is not detected by the toolchain.** `drizzle-kit generate` cannot find columns that silently differ from the live DB. Until we add a schema-vs-live audit, drift can only be found by hitting it at runtime.
- **Two branches, two applies.** Every schema/type change must be applied to **both** `development` and `main` (see CLAUDE.md "Neon Branches"). It is easy to fix one and forget the other.

## Recommended follow-up

- Add a lightweight CI/dev check that queries `information_schema.columns` and asserts that all `%user_id%` / `%_by%` / `uploaded_by` columns are `text` on both branches. Example query:
  ```sql
  SELECT table_name, column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='public'
    AND (column_name LIKE '%user_id%' OR column_name LIKE '%uploaded_by%' OR column_name LIKE '%\_by')
    AND data_type = 'uuid';
  -- expect zero rows
  ```
- Longer term, a periodic "schema doctor" that diffs the Drizzle snapshot against live `information_schema` would catch this whole class of drift.
