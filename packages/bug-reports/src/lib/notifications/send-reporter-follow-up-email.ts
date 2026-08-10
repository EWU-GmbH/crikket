import { env } from "@crikket/env/server"
import { render } from "@react-email/render"
import { Resend } from "resend"
import { ReporterFollowUpEmailTemplate } from "./templates/reporter-follow-up-template"

const MAX_SUBJECT_TITLE_LENGTH = 140

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
const fromEmail = env.RESEND_FROM_EMAIL
const fromName = "Crikket"

function buildReplyTo(): string | undefined {
  const replyTo = env.CRIKKET_SUPPORT_REPLY_TO?.trim()
  return replyTo && replyTo.length > 0 ? replyTo : undefined
}

export async function sendReporterFollowUpEmail(input: {
  to: string
  title: string
  message: string
  shareUrl?: string
}): Promise<void> {
  const subjectTitle =
    input.title.length > MAX_SUBJECT_TITLE_LENGTH
      ? `${input.title.slice(0, MAX_SUBJECT_TITLE_LENGTH - 1)}…`
      : input.title
  const subject = `Rückfrage zu Ihrer Meldung: ${subjectTitle}`

  const textLines = [
    "Zu Ihrer Meldung haben wir eine Rückfrage:",
    "",
    input.title,
    "",
    input.message,
    "",
    "Antworten Sie gerne direkt auf diese E-Mail — wir melden uns sobald wie möglich zurück.",
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
    ReporterFollowUpEmailTemplate({
      title: input.title,
      message: input.message,
      shareUrl: input.shareUrl,
    })
  )

  const replyTo = buildReplyTo()

  const { error } = await resendClient.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: input.to,
    subject,
    html,
    text: textLines.join("\n"),
    ...(replyTo ? { replyTo } : {}),
  })

  if (error) {
    throw new Error(`Failed to send reporter follow-up email: ${error.message}`)
  }
}
