/** Convert an org name to a URL-friendly slug. Lowercase, alphanumeric + hyphens. */
export function orgSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
