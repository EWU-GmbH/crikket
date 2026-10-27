const MAX_ACTIONS = 40
const MAX_LOGS = 50
const MAX_NETWORK = 40
const MAX_LINE_LENGTH = 240

export type DebuggerEmailPayload = {
  actions?: Array<{
    type?: string
    target?: string
    timestamp?: string
  }>
  logs?: Array<{
    level?: string
    message?: string
    timestamp?: string
  }>
  networkRequests?: Array<{
    method?: string
    url?: string
    status?: number
    duration?: number
  }>
}

export type DebuggerEmailExcerpt = {
  actionsText: string
  logsText: string
  networkText: string
  counts: {
    actions: number
    logs: number
    networkRequests: number
  }
}

function clip(value: string, max = MAX_LINE_LENGTH): string {
  const trimmed = value.replace(/\s+/g, " ").trim()
  if (trimmed.length <= max) {
    return trimmed
  }
  return `${trimmed.slice(0, max - 1)}…`
}

function remainderNote(shown: number, total: number): string {
  if (total <= shown) {
    return ""
  }
  return `\n… und ${total - shown} weitere (vollständig im Anhang debugger.json)`
}

export function formatDebuggerExcerpt(
  payload: DebuggerEmailPayload
): DebuggerEmailExcerpt {
  const actions = payload.actions ?? []
  const logs = payload.logs ?? []
  const networkRequests = payload.networkRequests ?? []

  const actionLines = actions.slice(0, MAX_ACTIONS).map((action, index) => {
    const type = clip(String(action.type ?? "action"), 40)
    const target = action.target ? `  ${clip(action.target, 160)}` : ""
    return `${index + 1}. ${type}${target}`
  })
  const logLines = logs.slice(0, MAX_LOGS).map((log) => {
    const level = String(log.level ?? "log").toUpperCase()
    return `[${level}] ${clip(String(log.message ?? ""), 200)}`
  })
  const networkLines = networkRequests.slice(0, MAX_NETWORK).map((request) => {
    const method = String(request.method ?? "?").toUpperCase()
    const status = request.status == null ? "" : `  ${request.status}`
    const duration =
      request.duration == null ? "" : `  ${request.duration}ms`
    return `${method}${status}${duration}  ${clip(String(request.url ?? ""), 180)}`
  })

  return {
    counts: {
      actions: actions.length,
      logs: logs.length,
      networkRequests: networkRequests.length,
    },
    actionsText:
      actionLines.length > 0
        ? `${actionLines.join("\n")}${remainderNote(actionLines.length, actions.length)}`
        : "Keine Schritte erfasst.",
    logsText:
      logLines.length > 0
        ? `${logLines.join("\n")}${remainderNote(logLines.length, logs.length)}`
        : "Keine Konsolenausgaben erfasst.",
    networkText:
      networkLines.length > 0
        ? `${networkLines.join("\n")}${remainderNote(networkLines.length, networkRequests.length)}`
        : "Keine Netzwerkanfragen erfasst.",
  }
}
