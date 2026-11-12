import { env } from "@crikket/env/server"
import { render } from "@react-email/render"
import { Resend } from "resend"
import { buildReceiptEmailCopy } from "./receipt-email-copy"
import { ReceiptEmailTemplate } from "./templates/receipt-template"

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
const fromEmail = env.RESEND_FROM_EMAIL
const fromName = "Crikket"

function buildReplyTo(): string | undefined {
  const replyTo = env.CRIKKET_SUPPORT_REPLY_TO?.trim()
  return replyTo && replyTo.length > 0 ? replyTo : undefined
}

/**
 * Receipt mail for a newly submitted report.
 * The payload is only the title, the public share link, and the account links.
 */
export async function sendReceiptEmail(input: {
  to: string
  title: string
  shareUrl?: string
  registerUrl?: string
  loginUrl?: string
}): Promise<void> {
  const copy = buildReceiptEmailCopy(input)

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

  const html = await render(ReceiptEmailTemplate({ copy }))
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
    throw new Error(`Failed to send receipt email: ${error.message}`)
  }
}
