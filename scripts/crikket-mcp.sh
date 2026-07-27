#!/usr/bin/env bash
# Launches the Crikket stdio MCP server for Cursor.
# Prefers CRIKKET_API_TOKEN; falls back to Cloud Agent secret `crikket`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -x "${HOME}/.bun/bin/bun" ]]; then
  BUN="${HOME}/.bun/bin/bun"
elif command -v bun >/dev/null 2>&1; then
  BUN="$(command -v bun)"
else
  echo "[crikket-mcp] bun is required but was not found on PATH" >&2
  exit 1
fi

export CRIKKET_API_TOKEN="${CRIKKET_API_TOKEN:-${crikket:-}}"
export CRIKKET_SERVER_URL="${CRIKKET_SERVER_URL:-https://report.ewu.tools}"

if [[ -z "${CRIKKET_API_TOKEN}" ]]; then
  echo "[crikket-mcp] Missing CRIKKET_API_TOKEN (or Cloud Agent secret named crikket)" >&2
  exit 1
fi

exec "${BUN}" run "${ROOT}/packages/mcp/src/cli.ts"
