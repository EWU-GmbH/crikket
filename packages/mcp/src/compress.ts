const DEFAULT_LOG_LIMIT = 40
const DEFAULT_ACTION_LIMIT = 40
const DEFAULT_NETWORK_LIMIT = 20
const MAX_MESSAGE_LENGTH = 500

type DebuggerEvents = {
  actions: Array<{
    id: string
    metadata: Record<string, unknown> | null
    offset: number | null
    target: string | null
    timestamp: string
    type: string
  }>
  logs: Array<{
    id: string
    level: string
    message: string
    metadata: Record<string, unknown> | null
    offset: number | null
    timestamp: string
  }>
}

type NetworkRequestItem = {
  duration: number | null
  id: string
  method: string
  status: number | null
  timestamp: string
  url: string
}

function truncate(value: string, max = MAX_MESSAGE_LENGTH): string {
  if (value.length <= max) {
    return value
  }

  return `${value.slice(0, max - 1)}…`
}

export function compressDebuggerContext(input: {
  actionsLimit?: number
  events: DebuggerEvents
  logsLimit?: number
  networkItems?: NetworkRequestItem[]
  networkLimit?: number
}) {
  const logsLimit = input.logsLimit ?? DEFAULT_LOG_LIMIT
  const actionsLimit = input.actionsLimit ?? DEFAULT_ACTION_LIMIT
  const networkLimit = input.networkLimit ?? DEFAULT_NETWORK_LIMIT

  const prioritizedLogs = [
    ...input.events.logs.filter((log) => log.level === "error"),
    ...input.events.logs.filter((log) => log.level === "warn"),
    ...input.events.logs.filter(
      (log) => log.level !== "error" && log.level !== "warn"
    ),
  ]
    .slice(0, logsLimit)
    .map((log) => ({
      level: log.level,
      message: truncate(log.message),
      offset: log.offset,
      timestamp: log.timestamp,
    }))

  const actions = input.events.actions.slice(-actionsLimit).map((action) => ({
    offset: action.offset,
    target: action.target ? truncate(action.target, 200) : null,
    timestamp: action.timestamp,
    type: action.type,
  }))

  const networkRequests = (input.networkItems ?? [])
    .slice(0, networkLimit)
    .map((request) => ({
      duration: request.duration,
      method: request.method,
      status: request.status,
      timestamp: request.timestamp,
      url: truncate(request.url, 300),
    }))

  return {
    actions,
    logs: prioritizedLogs,
    networkRequests,
    summary: {
      actionCount: input.events.actions.length,
      errorLogCount: input.events.logs.filter((log) => log.level === "error")
        .length,
      logCount: input.events.logs.length,
      networkCount: input.networkItems?.length ?? 0,
      warnLogCount: input.events.logs.filter((log) => log.level === "warn")
        .length,
    },
  }
}
