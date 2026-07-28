#!/usr/bin/env bash
# Removes old ewu-crikket-{server,web} image tags from the droplet's local
# Docker storage. Every deploy builds new master-<sha> tags (~2.6 GB each)
# and old tags were never cleaned up, filling the disk.
#
# Kept per repo:
#   1. tags referenced in the Coolify compose file (actively deployed)
#   2. the newest remaining tag (rollback comfort)
# Everything else is untagged/removed. Old states stay re-buildable from git
# (git archive <sha>), so local old images are convenience only.
#
# Runs on the droplet. Usage: bash scripts/prune-old-images.sh
set -euo pipefail

SERVICE_UUID="${CRIKKET_SERVICE_UUID:-***REMOVED***}"
COMPOSE_FILE="${COMPOSE_FILE:-/data/coolify/services/${SERVICE_UUID}/docker-compose.yml}"
REPOS=("ewu-crikket-server" "ewu-crikket-web")

if [[ ! -f "${COMPOSE_FILE}" ]]; then
  echo "ERROR: compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

for repo in "${REPOS[@]}"; do
  echo "== ${repo} =="

  # Tags currently referenced in the compose file (actively deployed).
  mapfile -t active_tags < <(grep -oE "${repo}:[^[:space:]\"']+" "${COMPOSE_FILE}" | sed "s|^${repo}:||" | sort -u)

  # All local tags, newest first (CreatedAt starts with sortable YYYY-MM-DD HH:MM:SS).
  mapfile -t lines < <(docker images "${repo}" --format '{{.Tag}} {{.CreatedAt}}' | sort -k2,3 -r)

  if [[ ${#lines[@]} -eq 0 ]]; then
    echo "  no local images"
    continue
  fi

  declare -A keep=()
  for tag in "${active_tags[@]}"; do
    keep["${tag}"]=1
  done

  # Newest tag that is not actively deployed -> rollback comfort, keep it too.
  for line in "${lines[@]}"; do
    tag="${line%% *}"
    [[ "${tag}" == "<none>" ]] && continue
    if [[ -z "${keep[${tag}]:-}" ]]; then
      keep["${tag}"]=1
      break
    fi
  done

  deleted=0
  for line in "${lines[@]}"; do
    tag="${line%% *}"
    [[ "${tag}" == "<none>" ]] && continue
    if [[ -n "${keep[${tag}]:-}" ]]; then
      echo "  keep    ${tag}"
    else
      if docker rmi "${repo}:${tag}" >/dev/null; then
        echo "  deleted ${tag}"
        deleted=$((deleted + 1))
      else
        echo "  WARN: could not remove ${repo}:${tag} (in use?)" >&2
      fi
    fi
  done
  [[ ${deleted} -eq 0 ]] && echo "  nothing to delete"
done

echo "== dangling images =="
docker image prune -f
