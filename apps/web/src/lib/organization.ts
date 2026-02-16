const MULTI_SPACE_REGEX = /\s+/g
const INVALID_SLUG_CHARS_REGEX = /[^a-z0-9-]/g
const MULTI_DASH_REGEX = /-+/g
const EDGE_DASH_REGEX = /^-+|-+$/g

export function slugifyOrganizationName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(MULTI_SPACE_REGEX, "-")
    .replace(INVALID_SLUG_CHARS_REGEX, "")
    .replace(MULTI_DASH_REGEX, "-")
    .replace(EDGE_DASH_REGEX, "")
}

export function shouldAutoSyncOrganizationSlug(
  currentSlug: string,
  previousName: string
): boolean {
  if (currentSlug.length === 0) {
    return true
  }

  return currentSlug === slugifyOrganizationName(previousName)
}
