/**
 * Format a "date-only" ISO timestamp (e.g. "2026-01-04T00:00:00.000Z") in UTC
 * so it doesn't shift one day backwards in negative-offset timezones.
 *
 * Use this for meeting dates and dues payment dates - anything where the
 * stored value represents a calendar day, not a precise moment in time.
 * For real timestamps (resource.createdAt etc.) keep toLocaleDateString().
 */
export function formatDateOnly(iso: string | Date | null | undefined): string {
  if (!iso) return ''
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return d.toLocaleDateString(undefined, { timeZone: 'UTC' })
}
