#!/bin/sh
# Installs the capture widget bundle from a freshly built web image as the
# statically served /crikket-capture.js.
#
# Background: Caddy serves /crikket-capture.js from the bind-mounted host
# directory $STATIC_DIR (see the caddy service in the Coolify compose file),
# NOT from the Docker image. Image deploys therefore never update the script —
# this script must run after every web image build.
#
# Runs on the droplet. Usage:
#   sh scripts/update-capture-static.sh <image-tag>   # e.g. master-f301a7e
set -eu

TAG="${1:?usage: update-capture-static.sh <image-tag, e.g. master-f301a7e>}"
IMAGE="ewu-crikket-web:${TAG}"
STATIC_DIR="${STATIC_DIR:-/data/coolify/services/***REMOVED***/static}"
BUNDLE_PATH="/app/sdks/capture/dist/capture.global.js"

tmpdir="$(mktemp -d)"
cid="$(docker create "${IMAGE}")"
cleanup() {
  docker rm -v "${cid}" >/dev/null 2>&1 || true
  rm -rf "${tmpdir}"
}
trap cleanup EXIT

docker cp "${cid}:${BUNDLE_PATH}" "${tmpdir}/crikket-capture.js"

# Sanity check: refuse to install a bundle without the attachment feature.
# Strings are German — the widget UI is translated (EWU customization).
for s in "Zusätzliche Anhänge" "Datei anhängen"; do
  if ! grep -q "${s}" "${tmpdir}/crikket-capture.js"; then
    echo "ERROR: bundle in ${IMAGE} is missing '${s}' — refusing to install" >&2
    exit 1
  fi
done

install -m 0644 "${tmpdir}/crikket-capture.js" "${STATIC_DIR}/crikket-capture.js"
echo "updated ${STATIC_DIR}/crikket-capture.js from ${IMAGE}"
