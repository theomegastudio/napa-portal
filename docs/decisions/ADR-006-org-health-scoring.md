# ADR-006: Five-dimension Org Health engagement score with 80-point baseline

**Status:** Accepted
**Date:** 2026-05-13
**Deciders:** Engineering, Product

## Context

Org Health needs a single headline number per org per year. The first cut used a 3-dimension formula (member count + attendance rate + dues) where new/empty years started at 0 and climbed. That felt wrong — orgs hadn't done anything wrong, the data just hadn't been collected yet — and the score numbers were so spread out that orgs looked worse than they were.

Product also asked for five specific metrics to track:

1. Minimum 2 attendees per monthly call
2. Minimum 2 attendees at NAPAAM (annual meeting)
3. Membership renewal + certification completion
4. Dues paid (with multi-payment plan support)
5. 1×1 with NAPA participation

## Decision

Score is `0..100` and is the sum of five dimensions, each `0..20`:

| Dimension | 20 (full credit) | Partial | 0 (explicit miss) | Baseline 16 (not yet measured) |
|---|---|---|---|---|
| Monthly meetings | `avg credit across past meetings × 20` where credit per meeting is `1.0` for ≥ 2 attendees, `0.5` for `1`, `0` for `0` | (encoded in avg) | All past meetings had `0` attendees | No past monthly meetings yet |
| NAPAAM | ≥ 2 attendees post-event | `10` for exactly 1 | `0` for 0 attendees after the date | NAPAAM date hasn't passed yet |
| Renewal & Cert | flagged complete | — | (no explicit-miss; falls through to baseline) | Not flagged |
| Dues | `paid >= target` | `10` for partial payment | (no explicit-miss) | No payments + no target |
| 1×1 with NAPA | flagged complete | — | — | Not flagged |

Future-dated monthly meetings show in the `X/12` attended display so admins can see the full year planned, but they do **not** count toward the score until the date passes. Same rule for NAPAAM.

A fully-completed empty year reads as **80** (5 × 16). A fully-completed everything-done year reads as **100**. An org that explicitly misses every measurable dimension drops to 0–60 depending on which measurements have occurred.

### Implementation

Server (`/api/v2/admin/org-health`) computes the authoritative score using past-only meeting filtering. The client also has a copy in `computeScore()` for optimistic updates when a checkbox toggles, but it can't filter past-only without each meeting's date — it trusts the server's `monthlyAttended` / `napaamAttendees` counts and applies the same per-dimension math.

Dues uses a child table `dues_payments` so a payment plan can be tracked as multiple rows. `duesPaid` is true when the sum of payments meets or exceeds the target. The platform-wide annual target lives in `platform_dues_targets`; per-org overrides on `dues_records.amount_cents` win when present.

## Consequences

### Positive

- Empty year shows 80, which matches the intuition that orgs are "in good standing" by default.
- Each of the 5 metrics is independently grokable: 20pts each.
- Future meetings don't punish the score; they expose plan progress through the `X/12` display.
- Dues multi-payment supports payment plans without requiring a fixed-amount target per org.

### Negative / trade-offs

- 80 is a higher floor than a strict "performance" score. A reader needs to know that 80 = "no data" and 100 = "everything done." We added a "How is the score calculated?" link on the Org Health page that opens a dialog explaining the math.
- Client-side `computeScore` can drift from the server if it doesn't know NAPAAM has occurred. We treat `napaamAttendees > 0` as "occurred" and `0` as either "not yet" or "explicit miss" — usually fine because most pre-event states haven't had `setNapaam` called.
- The 16/20/10/0 grading per dimension is arbitrary; if product wants a tighter spread (e.g. each dimension contributes 0/10/20 with no baseline), it's a single function change in `route.ts` and `page.tsx`.
