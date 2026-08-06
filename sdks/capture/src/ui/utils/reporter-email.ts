const LEGACY_REPORTER_EMAIL_STORAGE_KEY = "crikket:reporter-email"
const REPORTER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const REPORTER_EMAIL_MAX_LENGTH = 320

export function isValidReporterEmail(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= REPORTER_EMAIL_MAX_LENGTH &&
    REPORTER_EMAIL_REGEX.test(value)
  )
}

/**
 * Removes the reporter email that earlier widget versions stored in
 * localStorage to prefill the form. The widget no longer stores anything on the
 * device, so the leftover entry has to be cleaned up on load — the widget never
 * offered a way to delete it.
 */
export function clearLegacyStoredReporterEmail(): void {
  try {
    if (typeof window === "undefined") {
      return
    }
    window.localStorage.removeItem(LEGACY_REPORTER_EMAIL_STORAGE_KEY)
  } catch {
    // localStorage may be unavailable (private mode, disabled storage)
  }
}
