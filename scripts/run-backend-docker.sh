#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8787}"
IMAGE="${PSRCHIVE_DOCKER_IMAGE:-alex88ridolfi/psrchive_dspsr_presto_ubuntu22.04}"
CONTAINER_NAME="${PSRCHIVE_DOCKER_CONTAINER_NAME:-psrchive-viewer-backend-${PORT}}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

ARGS=(
  run
  --rm
  --name "${CONTAINER_NAME}"
  --publish "127.0.0.1:${PORT}:${PORT}"
  --workdir /workspace/backend
  --env PYTHONUNBUFFERED=1
  --env PYTHONDONTWRITEBYTECODE=1
  --mount type=volume,source=psrchive-viewer-pip-cache,target=/root/.cache/pip
  --volume "${BACKEND_DIR}:/workspace/backend"
)

for host_path in /Users /Volumes /private /tmp; do
  if [ -e "${host_path}" ]; then
    ARGS+=(--volume "${host_path}:${host_path}")
  fi
done

ARGS+=(
  "${IMAGE}"
  /bin/bash
  -lc
  "(python3 -c \"import fastapi,uvicorn,numpy\" >/dev/null 2>&1 || python3 -m pip install --disable-pip-version-check -r requirements.txt) && exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"
)

exec docker "${ARGS[@]}"
