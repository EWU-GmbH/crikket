export const REPORTER_EMAIL_FOOTER =
  "Sie erhalten diese E-Mail, weil Sie diese Meldung über das Feedback-Widget eingereicht und Ihre E-Mail-Adresse angegeben haben."

const MAX_SUBJECT_TITLE_LENGTH = 140

export function limitEmailSubjectTitle(title: string): string {
  if (title.length > MAX_SUBJECT_TITLE_LENGTH) {
    return `${title.slice(0, MAX_SUBJECT_TITLE_LENGTH - 1)}…`
  }

  return title
}
