import { isValidReporterEmail } from "../ui/utils/reporter-email"

export type ReporterEmailResolver = () =>
  | string
  | null
  | undefined
  | Promise<string | null | undefined>

let staticReporterEmail = ""
let reporterEmailResolver: ReporterEmailResolver | null = null
const listeners = new Set<(email: string) => void>()

function normalizeReporterEmail(email: string | null | undefined): string {
  const trimmed = email?.trim() ?? ""
  return trimmed.length > 0 && isValidReporterEmail(trimmed) ? trimmed : ""
}

function notifyListeners(email: string): void {
  for (const listener of listeners) {
    listener(email)
  }
}

export function configureReporterIdentity(input: {
  reporterEmail?: string
  getReporterEmail?: ReporterEmailResolver
}): void {
  if (input.getReporterEmail !== undefined) {
    reporterEmailResolver = input.getReporterEmail
  }

  if (input.reporterEmail !== undefined) {
    setReporterEmail(input.reporterEmail)
  }
}

export function setReporterEmail(email: string | null | undefined): string {
  const normalized = normalizeReporterEmail(email)
  staticReporterEmail = normalized
  notifyListeners(normalized)
  return normalized
}

export function getCachedReporterEmail(): string {
  return staticReporterEmail
}

export async function resolveReporterEmail(): Promise<string> {
  if (staticReporterEmail.length > 0) {
    return staticReporterEmail
  }

  if (!reporterEmailResolver) {
    return ""
  }

  const resolved = await reporterEmailResolver()
  return setReporterEmail(resolved)
}

export function subscribeReporterEmail(
  listener: (email: string) => void
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function resetReporterIdentity(): void {
  staticReporterEmail = ""
  reporterEmailResolver = null
  listeners.clear()
}
