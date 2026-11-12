import { limitEmailSubjectTitle, REPORTER_EMAIL_FOOTER } from "./email-copy"

const RECEIPT_HEADING = "Ihre Meldung ist eingegangen"
const RECEIPT_INTRO = "Ihre Meldung ist eingegangen:"
const ACCOUNT_HINT =
  "Mit derselben E-Mail-Adresse können Sie sich unter /register registrieren oder unter /login anmelden und die Meldung unter „Meine Meldungen“ verfolgen."

export interface ReceiptEmailCopy {
  subject: string
  preview: string
  heading: string
  intro: string
  title: string
  accountHint: string
  footer: string
  shareUrl?: string
  registerUrl?: string
  loginUrl?: string
  text: string
}

export function buildReceiptEmailCopy(input: {
  title: string
  shareUrl?: string
  registerUrl?: string
  loginUrl?: string
}): ReceiptEmailCopy {
  const subjectTitle = limitEmailSubjectTitle(input.title)
  const subject = `${RECEIPT_HEADING}: ${subjectTitle}`
  const textLines = [RECEIPT_INTRO, "", input.title]

  if (input.shareUrl) {
    textLines.push("", `Meldung ansehen: ${input.shareUrl}`)
  }

  textLines.push("", ACCOUNT_HINT)

  if (input.registerUrl) {
    textLines.push(`Registrieren: ${input.registerUrl}`)
  }

  if (input.loginUrl) {
    textLines.push(`Anmelden: ${input.loginUrl}`)
  }

  textLines.push("", REPORTER_EMAIL_FOOTER)

  return {
    subject,
    preview: subject,
    heading: RECEIPT_HEADING,
    intro: RECEIPT_INTRO,
    title: input.title,
    accountHint: ACCOUNT_HINT,
    footer: REPORTER_EMAIL_FOOTER,
    shareUrl: input.shareUrl,
    registerUrl: input.registerUrl,
    loginUrl: input.loginUrl,
    text: textLines.join("\n"),
  }
}
