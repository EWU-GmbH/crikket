export type NewReportEmailKind = "bug-report" | "feature-request"

export const MAX_DESCRIPTION_LENGTH = 1500
export const MAX_SUBJECT_TITLE_LENGTH = 140
const MAX_PAGE_URL_LENGTH = 300
const MAX_DETAIL_LENGTH = 200

const KIND_LABELS: Record<NewReportEmailKind, string> = {
  "bug-report": "Bug Report",
  "feature-request": "Feature Request",
}

const KIND_SUBJECTS: Record<NewReportEmailKind, string> = {
  "bug-report": "Neuer Bug Report",
  "feature-request": "Neuer Feature Request",
}

const TICKET_LINK_LABELS: Record<NewReportEmailKind, string> = {
  "bug-report": "Meldung im Dashboard öffnen",
  "feature-request": "Feature Request im Kan-Board öffnen",
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
}

const NO_PRIORITY_VALUE = "none"

const LINE_BREAKS_REGEX = /\r\n?/g
const EXCESS_BLANK_LINES_REGEX = /\n{3,}/g
const INLINE_WHITESPACE_REGEX = /\s+/g
// biome-ignore lint/suspicious/noControlCharactersInRegex: strips control chars from user input
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

export type NewReportEmailAttachments = {
  captureType?: "screenshot" | "video" | null
  extraCount?: number
}

export type NewReportEmailDeviceInfo = {
  browser?: string | null
  os?: string | null
  viewport?: string | null
} | null

export type NewReportEmailContentInput = {
  kind: NewReportEmailKind
  title: string
  description?: string | null
  priority?: string | null
  reporterLabel: string
  pageUrl?: string | null
  pageTitle?: string | null
  deviceInfo?: NewReportEmailDeviceInfo
  attachments?: NewReportEmailAttachments | null
  submittedAt?: Date
  ticketUrl?: string | null
}

export type NewReportEmailDetail = {
  label: string
  value: string
}

export type NewReportEmailContent = {
  kindLabel: string
  subject: string
  title: string
  details: NewReportEmailDetail[]
  description: {
    text: string
    truncated: boolean
    totalLength: number
    truncationNote: string | null
  } | null
  ticket: { url: string; label: string } | null
  footer: string
  textBody: string
}

const FOOTER =
  "Sie erhalten diese E-Mail, weil Sie Eigentümer der Organisation sind, der diese Meldung zugeordnet ist."

function clean(value: string | null | undefined): string {
  return (value ?? "").replace(CONTROL_CHARS_REGEX, "").trim()
}

function clipInline(value: string | null | undefined, max: number): string {
  const normalized = clean(value).replace(INLINE_WHITESPACE_REGEX, " ")
  const chars = Array.from(normalized)
  if (chars.length <= max) {
    return normalized
  }
  return `${chars
    .slice(0, max - 1)
    .join("")
    .trimEnd()}…`
}

export function buildNewReportSubject(
  kind: NewReportEmailKind,
  title: string
): string {
  const subjectTitle = clipInline(title, MAX_SUBJECT_TITLE_LENGTH)
  return `${KIND_SUBJECTS[kind]}: ${subjectTitle}`
}

export function truncateDescription(
  raw: string | null | undefined,
  max = MAX_DESCRIPTION_LENGTH
): NewReportEmailContent["description"] {
  const normalized = clean(
    (raw ?? "")
      .replace(LINE_BREAKS_REGEX, "\n")
      .replace(EXCESS_BLANK_LINES_REGEX, "\n\n")
  )
  if (!normalized) {
    return null
  }

  const chars = Array.from(normalized)
  if (chars.length <= max) {
    return {
      text: normalized,
      truncated: false,
      totalLength: chars.length,
      truncationNote: null,
    }
  }

  return {
    text: `${chars.slice(0, max).join("").trimEnd()}…`,
    truncated: true,
    totalLength: chars.length,
    truncationNote: `Text gekürzt (${max} von ${chars.length} Zeichen) – den vollständigen Text finden Sie im Ticket.`,
  }
}

export function formatNewReportTimestamp(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    return ""
  }
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
    timeZoneName: "short",
  }).format(date)
}

function buildDeviceSummary(deviceInfo: NewReportEmailDeviceInfo): string {
  if (!deviceInfo) {
    return ""
  }
  return [deviceInfo.browser, deviceInfo.os, deviceInfo.viewport]
    .map((part) => clipInline(part, MAX_DETAIL_LENGTH))
    .filter((part) => part.length > 0)
    .join(" · ")
}

function buildAttachmentSummary(
  attachments: NewReportEmailAttachments | null | undefined
): string {
  if (!attachments) {
    return ""
  }
  const captureLabel =
    attachments.captureType === "video" ? "Video" : "Screenshot"
  const hasCapture = attachments.captureType != null
  const extra = Math.max(0, Math.trunc(attachments.extraCount ?? 0))
  const parts = [`${captureLabel}: ${hasCapture ? "ja" : "nein"}`]
  parts.push(
    extra === 0 ? "weitere Anhänge: keine" : `weitere Anhänge: ${extra}`
  )
  return parts.join(" · ")
}

function buildPageSummary(input: {
  pageUrl?: string | null
  pageTitle?: string | null
}): string {
  const url = clipInline(input.pageUrl, MAX_PAGE_URL_LENGTH)
  const title = clipInline(input.pageTitle, MAX_DETAIL_LENGTH)
  if (title && url) {
    return `${title} (${url})`
  }
  return url || title
}

function resolvePriorityLabel(
  priority: string | null | undefined
): string | undefined {
  const raw = clipInline(priority, MAX_DETAIL_LENGTH)
  if (!raw || raw === NO_PRIORITY_VALUE) {
    return undefined
  }
  return PRIORITY_LABELS[raw] ?? raw
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

function readStringField(source: unknown, key: string): string | undefined {
  if (typeof source !== "object" || source === null) {
    return undefined
  }
  const value = (source as Record<string, unknown>)[key]
  return typeof value === "string" ? value : undefined
}

export function readNewReportPageTitle(metadata: unknown): string | undefined {
  return readStringField(metadata, "pageTitle")
}

export function readNewReportDeviceInfo(
  deviceInfo: unknown
): NewReportEmailDeviceInfo {
  if (typeof deviceInfo !== "object" || deviceInfo === null) {
    return null
  }
  return {
    browser: readStringField(deviceInfo, "browser"),
    os: readStringField(deviceInfo, "os"),
    viewport: readStringField(deviceInfo, "viewport"),
  }
}

export function buildNewReportEmailContent(
  input: NewReportEmailContentInput
): NewReportEmailContent {
  const kindLabel = KIND_LABELS[input.kind]
  const title = clipInline(input.title, MAX_DETAIL_LENGTH * 2) || "Ohne Titel"
  const priorityLabel = resolvePriorityLabel(input.priority)
  const pageSummary = buildPageSummary(input)
  const deviceSummary = buildDeviceSummary(input.deviceInfo ?? null)
  const attachmentSummary = buildAttachmentSummary(input.attachments)
  const timestamp = formatNewReportTimestamp(input.submittedAt ?? new Date())
  const description = truncateDescription(input.description)

  const candidates: Array<NewReportEmailDetail | null> = [
    { label: "Typ", value: kindLabel },
    {
      label: "Gemeldet von",
      value: clipInline(input.reporterLabel, MAX_DETAIL_LENGTH) || "anonym",
    },
    priorityLabel ? { label: "Priorität", value: priorityLabel } : null,
    pageSummary ? { label: "Seite", value: pageSummary } : null,
    deviceSummary ? { label: "Browser/Gerät", value: deviceSummary } : null,
    attachmentSummary ? { label: "Anhänge", value: attachmentSummary } : null,
    timestamp ? { label: "Zeitpunkt", value: timestamp } : null,
  ]
  const details = candidates.filter(
    (detail): detail is NewReportEmailDetail => detail !== null
  )

  const ticketUrl = clean(input.ticketUrl)
  const ticket =
    ticketUrl && isHttpsUrl(ticketUrl)
      ? { url: ticketUrl, label: TICKET_LINK_LABELS[input.kind] }
      : null

  const textLines = [
    `Es ist ein neuer ${kindLabel} eingegangen:`,
    "",
    title,
    "",
    ...details.map((detail) => `${detail.label}: ${detail.value}`),
  ]
  if (description) {
    textLines.push("", "Beschreibung:", description.text)
    if (description.truncationNote) {
      textLines.push(`(${description.truncationNote})`)
    }
  }
  if (ticket) {
    textLines.push("", `${ticket.label}: ${ticket.url}`)
  }
  textLines.push("", FOOTER)

  return {
    kindLabel,
    subject: buildNewReportSubject(input.kind, input.title),
    title,
    details,
    description,
    ticket,
    footer: FOOTER,
    textBody: textLines.join("\n"),
  }
}
