import { env } from "@crikket/env/server"
import { render } from "@react-email/render"
import { Resend } from "resend"
import { ResolutionEmailTemplate } from "./templates/resolution-template"

export type ResolutionEmailKind = "bug-report" | "feature-request"

const KIND_LABELS: Record<ResolutionEmailKind, string> = {
  "bug-report": "Bug Report",
  "feature-request": "Feature Request",
}

const MAX_SUBJECT_TITLE_LENGTH = 140

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
const fromEmail = env.RESEND_FROM_EMAIL
const fromName = "Crikket"

export async function sendResolutionEmail(input: {
  to: string
  kind: ResolutionEmailKind
  title: string
  shareUrl?: string
}): Promise<void> {
  const kindLabel = KIND_LABELS[input.kind]
  const subjectTitle =
    input.title.length > MAX_SUBJECT_TITLE_LENGTH
      ? `${input.title.slice(0, MAX_SUBJECT_TITLE_LENGTH - 1)}…`
      : input.title
  const subject = `Ihre Meldung wurde erledigt: ${subjectTitle}`

  const textLines = [
    `Ihre Meldung (${kindLabel}) wurde soeben erledigt:`,
    "",
    input.title,
    "",
    "Vielen Dank für Ihr Feedback — es hilft uns, das Produkt weiterzuentwickeln.",
  ]
  if (input.shareUrl) {
    textLines.push("", `Meldung ansehen: ${input.shareUrl}`)
  }
  textLines.push(
    "",
    "Sie erhalten diese E-Mail, weil Sie diese Meldung über das Feedback-Widget eingereicht und Ihre E-Mail-Adresse angegeben haben."
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
    ResolutionEmailTemplate({
      kindLabel,
      title: input.title,
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
    throw new Error(`Failed to send resolution email: ${error.message}`)
  }
}
