import { env } from "@crikket/env/server"
import type { BugReportCommentPurpose } from "@crikket/shared/constants/bug-report"
import { render } from "@react-email/render"
import { Resend } from "resend"
import { buildReporterFollowUpCopy } from "./reporter-follow-up-copy"
import { ReporterFollowUpEmailTemplate } from "./templates/reporter-follow-up-template"

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
  purpose?: BugReportCommentPurpose
}): Promise<void> {
  const copy = buildReporterFollowUpCopy({
    message: input.message,
    purpose: input.purpose,
    shareUrl: input.shareUrl,
    title: input.title,
  })

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

  const html = await render(ReporterFollowUpEmailTemplate({ copy }))
  const replyTo = buildReplyTo()

  const { error } = await resendClient.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: input.to,
    subject: copy.subject,
    html,
    text: copy.text,
    ...(replyTo ? { replyTo } : {}),
  })

  if (error) {
    throw new Error(`Failed to send reporter follow-up email: ${error.message}`)
  }
}
