#!/usr/bin/env bash
# bash deploy/deploy.sh ghcr.io/fkhr0/linkpulse:<commit>
# new image, wait for healthy, else back to the old one
set -euo pipefail
cd "$(dirname "$0")"

NEW="${1:?image}"
OLD="$(grep -E '^IMAGE=' .env | cut -d= -f2- || true)"

set_image() { sed -i "s|^IMAGE=.*|IMAGE=$1|" .env; }

healthy() {
  for _ in $(seq 1 30); do
    [[ "$(docker inspect -f '{{.State.Health.Status}}' "$(docker compose ps -q linkpulse)" 2>/dev/null)" == healthy ]] && return 0
    sleep 3
  done
  return 1
}

set_image "$NEW"
docker compose pull linkpulse
docker compose up -d linkpulse
if ! healthy; then
  echo "not healthy, back to $OLD" >&2
  set_image "$OLD"
  docker compose up -d linkpulse
  exit 1
fi
docker image prune -f >/dev/null
echo "deployed $NEW"
