export type JiraMailOrgConfig = Record<string, string>

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseJiraMailOrgJson(
  raw: string | undefined
): JiraMailOrgConfig | null {
  const trimmed = raw?.trim()
  if (!trimmed) {
    return null
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      console.error("[jira-mail] CRIKKET_JIRA_MAIL_ORG_JSON must be a JSON object")
      return null
    }

    const config: JiraMailOrgConfig = {}
    for (const [organizationId, mailbox] of Object.entries(parsed)) {
      const orgId = organizationId.trim()
      const email = typeof mailbox === "string" ? mailbox.trim() : ""
      if (!orgId || !EMAIL_REGEX.test(email)) {
        console.error(
          `[jira-mail] Skipping invalid CRIKKET_JIRA_MAIL_ORG_JSON entry for "${organizationId}"`
        )
        continue
      }
      config[orgId] = email
    }

    return Object.keys(config).length > 0 ? config : null
  } catch (error) {
    console.error("[jira-mail] CRIKKET_JIRA_MAIL_ORG_JSON could not be parsed", error)
    return null
  }
}
