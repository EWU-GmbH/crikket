import { getJiraMailboxForOrganization } from "./jira-mail-config"
import { getBugReportShareUrl } from "./share-url"
import { sendJiraBugEmail } from "./send-jira-bug-email"

export async function notifyJiraAboutNewBug(input: {
  organizationId: string
  title: string
  description?: string | null
  pageUrl?: string | null
  priority?: string | null
  reporterEmail?: string | null
  reportId: string
  captureKey?: string | null
  captureContentType?: string | null
  debuggerKey?: string | null
  debuggerContentEncoding?: string | null
  deviceInfo?: {
    browser?: string
    os?: string
    viewport?: string
  } | null
}): Promise<void> {
  const mailbox = getJiraMailboxForOrganization(input.organizationId)
  if (!mailbox) {
    return
  }

  await sendJiraBugEmail({
    to: mailbox,
    title: input.title,
    description: input.description,
    pageUrl: input.pageUrl,
    priority: input.priority,
    reporterEmail: input.reporterEmail,
    shareUrl: getBugReportShareUrl(input.reportId),
    captureKey: input.captureKey,
    captureContentType: input.captureContentType,
    debuggerKey: input.debuggerKey,
    debuggerContentEncoding: input.debuggerContentEncoding,
    deviceInfo: input.deviceInfo,
  })
}

export function notifyJiraAboutNewBugInBackground(
  input: Parameters<typeof notifyJiraAboutNewBug>[0],
  context: string
): void {
  notifyJiraAboutNewBug(input).catch((error: unknown) => {
    console.error(`[notify] ${context} failed`, error)
  })
}
