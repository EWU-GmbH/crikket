import { env } from "@crikket/env/server"
import {
  parseJiraMailOrgJson,
  type JiraMailOrgConfig,
} from "./jira-mail-config-parse"

export { parseJiraMailOrgJson }

let cachedConfig: JiraMailOrgConfig | null | undefined

function getJiraMailOrgConfig(): JiraMailOrgConfig | null {
  if (cachedConfig !== undefined) {
    return cachedConfig
  }
  cachedConfig = parseJiraMailOrgJson(env.CRIKKET_JIRA_MAIL_ORG_JSON)
  return cachedConfig
}

export function getJiraMailboxForOrganization(
  organizationId: string
): string | null {
  return getJiraMailOrgConfig()?.[organizationId]?.trim() || null
}
