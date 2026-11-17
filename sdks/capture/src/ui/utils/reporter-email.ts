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

export const REPORTER_EMAIL_REQUIRED_MESSAGE =
  "Bitte geben Sie Ihre E-Mail-Adresse ein. Die E-Mail-Adresse ist ein Pflichtfeld."
export const REPORTER_EMAIL_INVALID_MESSAGE =
  "Geben Sie eine gültige E-Mail-Adresse ein."

export function getReporterEmailError(
  value: string | undefined,
  options?: { required?: boolean }
): string | undefined {
  const reporterEmail = value?.trim() ?? ""
  if (reporterEmail.length === 0) {
    return options?.required ? REPORTER_EMAIL_REQUIRED_MESSAGE : undefined
  }

  return isValidReporterEmail(reporterEmail)
    ? undefined
    : REPORTER_EMAIL_INVALID_MESSAGE
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
