#!/usr/bin/env bash
# Registers the Crikket resolution-sync webhook in the kan workspaces and
# ensures KAN_WEBHOOK_SECRET is set in the Coolify service .env.
# Idempotent: existing webhooks for the same URL are kept, an existing
# KAN_WEBHOOK_SECRET is never overwritten.
#
# Usage (on the droplet):
#   ENV_FILE=<path to Coolify service .env> sh setup-kan-webhook.sh <workspacePublicId ...>
#
# Target kan workspaces are passed as arguments (or via the KAN_WORKSPACES
# env var) — there is intentionally no default.
set -euo pipefail

ENV_FILE=${ENV_FILE:?error: set ENV_FILE to the Coolify service .env path}
WEBHOOK_URL=${WEBHOOK_URL:-https://report.ewu.tools/api/webhooks/kan}
WEBHOOK_NAME=${WEBHOOK_NAME:-crikket-resolution-sync}

WORKSPACES="${*:-${KAN_WORKSPACES:?error: pass kan workspace public IDs as arguments or set KAN_WORKSPACES}}"

read_env() {
  { grep "^$1=" "$ENV_FILE" || true; } | tail -n1 | cut -d= -f2- | tr -d '\r'"'\""
}

KAN_BASE_URL="$(read_env KAN_BASE_URL)"
KAN_API_KEY="$(read_env KAN_API_KEY)"
SECRET="$(read_env KAN_WEBHOOK_SECRET)"

if [ -z "$KAN_BASE_URL" ] || [ -z "$KAN_API_KEY" ]; then
  echo "error: KAN_BASE_URL/KAN_API_KEY missing in $ENV_FILE" >&2
  exit 1
fi

if [ -z "$SECRET" ]; then
  SECRET="$(openssl rand -hex 32)"
  echo "KAN_WEBHOOK_SECRET='$SECRET'" >> "$ENV_FILE"
  echo "generated KAN_WEBHOOK_SECRET and appended it to $ENV_FILE"
else
  echo "KAN_WEBHOOK_SECRET already present in $ENV_FILE"
fi

for WS in $WORKSPACES; do
  EXISTING=$(curl -sS -m 15 \
    -H "Authorization: Bearer $KAN_API_KEY" \
    "$KAN_BASE_URL/api/v1/workspaces/$WS/webhooks")

  if echo "$EXISTING" | grep -q "$WEBHOOK_URL"; then
    echo "workspace $WS: webhook for $WEBHOOK_URL already registered, skipping"
    continue
  fi

  RESPONSE=$(curl -sS -m 15 -X POST \
    -H "Authorization: Bearer $KAN_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$WEBHOOK_NAME\",\"url\":\"$WEBHOOK_URL\",\"secret\":\"$SECRET\",\"events\":[\"card.moved\"]}" \
    "$KAN_BASE_URL/api/v1/workspaces/$WS/webhooks")

  echo "workspace $WS: $RESPONSE"
done

echo "done. Restart the stack to pick up env changes: cd $(dirname "$ENV_FILE") && docker compose -p $(basename "$(dirname "$ENV_FILE")") up -d"
