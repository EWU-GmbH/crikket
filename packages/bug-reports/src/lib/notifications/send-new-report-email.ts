import { env } from "@crikket/env/server"
import { render } from "@react-email/render"
import { Resend } from "resend"
import {
  buildNewReportEmailContent,
  type NewReportEmailContentInput,
} from "./new-report-email-content"
import { NewReportEmailTemplate } from "./templates/new-report-template"

const resendClient = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
const fromEmail = env.RESEND_FROM_EMAIL
const fromName = "Crikket"

export type { NewReportEmailKind } from "./new-report-email-content"

export async function sendNewReportEmail(
  input: NewReportEmailContentInput & { to: string }
): Promise<void> {
  const content = buildNewReportEmailContent(input)

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

  const html = await render(NewReportEmailTemplate({ content }))

  const { error } = await resendClient.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: input.to,
    subject: content.subject,
    html,
    text: content.textBody,
  })

  if (error) {
    throw new Error(`Failed to send new report email: ${error.message}`)
  }
}
