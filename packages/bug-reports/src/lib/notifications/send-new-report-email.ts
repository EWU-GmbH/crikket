import { env } from "@crikket/env/server"
import { render } from "@react-email/render"
import { Resend } from "resend"
import { NewReportEmailTemplate } from "./templates/new-report-template"

export type NewReportEmailKind = "bug-report" | "feature-request"

const KIND_LABELS: Record<NewReportEmailKind, string> = {
  "bug-report": "Bug Report",
  "feature-request": "Feature Request",
}

const KIND_SUBJECTS: Record<NewReportEmailKind, string> = {
  "bug-report": "Neuer Bug Report",
  "feature-request": "Neuer Feature Request",
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Kritisch",
  high: "Hoch",
  medium: "Mittel",
  low: "Niedrig",
}

const MAX_SUBJECT_TITLE_LENGTH = 140

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
const fromEmail = env.RESEND_FROM_EMAIL
const fromName = "Crikket"

export async function sendNewReportEmail(input: {
  to: string
  kind: NewReportEmailKind
  title: string
  priority?: string | null
  reporterLabel: string
  shareUrl?: string
}): Promise<void> {
  const kindLabel = KIND_LABELS[input.kind]
  const priorityLabel = input.priority
    ? PRIORITY_LABELS[input.priority]
    : undefined
  const subjectTitle =
    input.title.length > MAX_SUBJECT_TITLE_LENGTH
      ? `${input.title.slice(0, MAX_SUBJECT_TITLE_LENGTH - 1)}…`
      : input.title
  const subject = `${KIND_SUBJECTS[input.kind]}: ${subjectTitle}`

  const textLines = [
    `Es ist ein neuer ${kindLabel} eingegangen:`,
    "",
    input.title,
    "",
    `Gemeldet von: ${input.reporterLabel}`,
  ]
  if (priorityLabel) {
    textLines.push(`Priorität: ${priorityLabel}`)
  }
  if (input.shareUrl) {
    textLines.push("", `Meldung ansehen: ${input.shareUrl}`)
  }
  textLines.push(
    "",
    "Sie erhalten diese E-Mail, weil Sie Eigentümer der Organisation sind, der diese Meldung zugeordnet ist."
  )

  if (!resendClient) {
    if (env.NODE_ENV === "production") {
      throw new Error(
        "Missing RESEND_API_KEY. Set RESEND_API_KEY in apps/server/.env."
      )
    }

    console.warn(
      `[email] Missing RESEND_API_KEY in apps/server/.env. Skipping email delivery for ${input.to}.`
    )

    return
  }

  if (!fromEmail) {
    throw new Error(
      "Missing RESEND_FROM_EMAIL. Set RESEND_FROM_EMAIL in apps/server/.env."
    )
  }

  const html = await render(
    NewReportEmailTemplate({
      kindLabel,
      title: input.title,
      priorityLabel,
      reporterLabel: input.reporterLabel,
      shareUrl: input.shareUrl,
    })
  )

  const { error } = await resendClient.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: input.to,
    subject,
    html,
    text: textLines.join("\n"),
  })

  if (error) {
    throw new Error(`Failed to send new report email: ${error.message}`)
  }
}
