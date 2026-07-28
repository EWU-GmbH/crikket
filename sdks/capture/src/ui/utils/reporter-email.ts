const REPORTER_EMAIL_STORAGE_KEY = "crikket:reporter-email"
const REPORTER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const REPORTER_EMAIL_MAX_LENGTH = 320

export function isValidReporterEmail(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= REPORTER_EMAIL_MAX_LENGTH &&
    REPORTER_EMAIL_REGEX.test(value)
  )
}

export function readStoredReporterEmail(): string {
  try {
    if (typeof window === "undefined") {
      return ""
    }
    return window.localStorage.getItem(REPORTER_EMAIL_STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}

export function storeReporterEmail(email: string): void {
  try {
    if (typeof window === "undefined") {
      return
    }
    const trimmed = email.trim()
    if (isValidReporterEmail(trimmed)) {
      window.localStorage.setItem(REPORTER_EMAIL_STORAGE_KEY, trimmed)
    }
  } catch {
    // localStorage may be unavailable (private mode, disabled storage)
  }
}
