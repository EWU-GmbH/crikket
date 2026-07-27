import {
  createApiToken,
  deleteApiToken,
  listApiTokens,
  revokeApiToken,
  rotateApiToken,
} from "@crikket/bug-reports/procedures/api-tokens"

/**
 * API Token Router
 * Org-scoped integration tokens for MCP and machine access.
 */
export const apiTokenRouter = {
  list: listApiTokens,
  create: createApiToken,
  delete: deleteApiToken,
  revoke: revokeApiToken,
  rotate: rotateApiToken,
}
