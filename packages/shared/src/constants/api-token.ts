export const API_TOKEN_SCOPE_OPTIONS = {
  bugReportsRead: "bug-reports:read",
  bugReportsWrite: "bug-reports:write",
} as const

export type ApiTokenScope =
  (typeof API_TOKEN_SCOPE_OPTIONS)[keyof typeof API_TOKEN_SCOPE_OPTIONS]

export const API_TOKEN_SCOPES = Object.values(API_TOKEN_SCOPE_OPTIONS) as [
  ApiTokenScope,
  ...ApiTokenScope[],
]

export const DEFAULT_API_TOKEN_SCOPES: ApiTokenScope[] = [
  API_TOKEN_SCOPE_OPTIONS.bugReportsRead,
  API_TOKEN_SCOPE_OPTIONS.bugReportsWrite,
]

export const API_TOKEN_STATUS_OPTIONS = {
  active: "active",
  revoked: "revoked",
} as const

export type ApiTokenStatus =
  (typeof API_TOKEN_STATUS_OPTIONS)[keyof typeof API_TOKEN_STATUS_OPTIONS]
