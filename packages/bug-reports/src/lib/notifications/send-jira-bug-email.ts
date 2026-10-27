import { env } from "@crikket/env/server"
import { render } from "@react-email/render"
import { Resend } from "resend"
import { getStorageProvider, resolveCaptureUrl } from "../storage"
import { formatDebuggerExcerpt } from "./debugger-email-format"
import { loadDebuggerPayload } from "./load-debugger-payload"
import { JiraBugEmailTemplate } from "./templates/jira-bug-email-template"

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
}

const MAX_SUBJECT_TITLE_LENGTH = 140
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
const fromEmail = env.RESEND_FROM_EMAIL

type DeviceInfo = {
  browser?: string
  os?: string
  viewport?: string
} | null

export type JiraBugEmailInput = {
  to: string
  title: string
  description?: string | null
  pageUrl?: string | null
  priority?: string | null
  reporterEmail?: string | null
  shareUrl?: string
  captureKey?: string | null
  captureContentType?: string | null
  debuggerKey?: string | null
  debuggerContentEncoding?: string | null
  deviceInfo?: DeviceInfo
}

function buildDeviceSummary(deviceInfo: DeviceInfo): string | null {
  if (!deviceInfo) {
    return null
  }
  const parts = [deviceInfo.browser, deviceInfo.os, deviceInfo.viewport]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
  return parts.length > 0 ? parts.join(" · ") : null
}

function buildFromHeader(reporterEmail: string | null): string {
  if (!fromEmail) {
    throw new Error(
      "Missing RESEND_FROM_EMAIL. Set RESEND_FROM_EMAIL in apps/server/.env."
    )
  }
  if (!reporterEmail) {
    return `Crikket <${fromEmail}>`
  }
  const display = reporterEmail.replace(/[<>"]/g, "").slice(0, 78)
  return `${display} via Crikket <${fromEmail}>`
}

function attachmentFilename(contentType: string | null | undefined): string {
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) {
    return "screenshot.jpg"
  }
  if (contentType?.includes("webp")) {
    return "screenshot.webp"
  }
  return "screenshot.png"
}

function isImageCapture(contentType: string | null | undefined): boolean {
  return (contentType ?? "").startsWith("image/")
}

async function loadScreenshotAttachment(input: {
  captureKey?: string | null
  captureContentType?: string | null
}): Promise<Array<{ filename: string; content: Buffer }>> {
  if (!input.captureKey || !isImageCapture(input.captureContentType)) {
    return []
  }

  try {
    const content = await getStorageProvider().read(input.captureKey)
    if (content.length === 0 || content.length > MAX_ATTACHMENT_BYTES) {
      return []
    }
    return [
      {
        filename: attachmentFilename(input.captureContentType),
        content,
      },
    ]
  } catch (error) {
    console.error("[jira-mail] Could not attach screenshot", error)
    return []
  }
}

export async function sendJiraBugEmail(input: JiraBugEmailInput): Promise<void> {
  const priorityLabel = input.priority
    ? PRIORITY_LABELS[input.priority]
    : undefined
  const reporterEmail = input.reporterEmail?.trim() || null
  const subjectTitle =
    input.title.length > MAX_SUBJECT_TITLE_LENGTH
      ? `${input.title.slice(0, MAX_SUBJECT_TITLE_LENGTH - 1)}…`
      : input.title
  const subject = `[Bewerbungstool] ${subjectTitle}`
  const deviceSummary = buildDeviceSummary(input.deviceInfo ?? null)
  const captureUrl = await resolveCaptureUrl({
    captureKey: input.captureKey ?? null,
  })
  let debuggerExcerpt: ReturnType<typeof formatDebuggerExcerpt> | null = null
  let debuggerJson: Buffer | null = null
  try {
    const loaded = await loadDebuggerPayload({
      debuggerKey: input.debuggerKey,
      debuggerContentEncoding: input.debuggerContentEncoding,
    })
    if (loaded) {
      debuggerExcerpt = formatDebuggerExcerpt(loaded.payload)
      debuggerJson =
        loaded.jsonAttachment.length > 0 &&
        loaded.jsonAttachment.length <= MAX_ATTACHMENT_BYTES
          ? loaded.jsonAttachment
          : null
    }
  } catch (error) {
    console.error("[jira-mail] Could not load debugger payload", error)
  }

  const textLines = [
    input.title,
    "",
    input.description?.trim() || "Keine Beschreibung angegeben.",
    "",
    `Melder: ${reporterEmail || "nicht angegeben"}`,
  ]
  if (priorityLabel) {
    textLines.push(`Priorität: ${priorityLabel}`)
  }
  if (input.pageUrl?.trim()) {
    textLines.push(`Seite: ${input.pageUrl.trim()}`)
  }
  if (deviceSummary) {
    textLines.push(`Gerät: ${deviceSummary}`)
  }
  if (captureUrl) {
    textLines.push(`Aufnahme: ${captureUrl}`)
  }
  if (input.shareUrl) {
    textLines.push("", `Crikket: ${input.shareUrl}`)
  }
  if (debuggerExcerpt) {
    textLines.push(
      "",
      `Kontext: ${debuggerExcerpt.counts.actions} Schritte, ${debuggerExcerpt.counts.logs} Konsole, ${debuggerExcerpt.counts.networkRequests} Netzwerk`,
      "",
      "Schritte",
      debuggerExcerpt.actionsText,
      "",
      "Konsole",
      debuggerExcerpt.logsText,
      "",
      "Netzwerk",
      debuggerExcerpt.networkText
    )
  }

  if (!resendClient) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "Missing RESEND_API_KEY. Set RESEND_API_KEY in apps/server/.env."
      )
    }
    console.warn(
      `[jira-mail] Missing RESEND_API_KEY. Skipping Jira mail for ${input.to}.`
    )
    return
  }

  const html = await render(
    JiraBugEmailTemplate({
      title: input.title,
      description: input.description,
      pageUrl: input.pageUrl,
      priorityLabel,
      reporterEmail,
      shareUrl: input.shareUrl,
      deviceSummary,
      captureUrl,
      actionsText: debuggerExcerpt?.actionsText,
      logsText: debuggerExcerpt?.logsText,
      networkText: debuggerExcerpt?.networkText,
      debuggerCounts: debuggerExcerpt?.counts,
    })
  )

  const attachments = [
    ...(await loadScreenshotAttachment(input)),
    ...(debuggerJson
      ? [{ filename: "debugger.json", content: debuggerJson }]
      : []),
  ]

  const { error } = await resendClient.emails.send({
    from: buildFromHeader(reporterEmail),
    to: input.to,
    subject,
    html,
    text: textLines.join("\n"),
    ...(reporterEmail ? { replyTo: reporterEmail } : {}),
    ...(attachments.length > 0 ? { attachments } : {}),
  })

  if (error) {
    throw new Error(`Failed to send Jira bug email: ${error.message}`)
  }
}
