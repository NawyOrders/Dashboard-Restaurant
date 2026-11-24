#!/usr/bin/env bash
#
# Build and deploy the restaurant admin dashboard on the shared VPS.
#
# Run from the directory that contains docker-compose.deploy.yml:
#
#   IMAGE_TAG="$(git rev-parse --short HEAD)" bash deploy/restaurant-dashboard.sh
#
# The script builds the image locally on the VPS, starts only this container on
# the shared Caddy network, waits for its health check, and rolls back to the
# image that was running before if the new one does not become healthy.
#
# Shared-host safety: this compose project contains exactly one service and is
# always addressed with --no-deps. It never touches the backend stack, the
# storefront or Caddy.

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/nawyorders/restaurant-dashboard}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.deploy.yml}"
SERVICE="${SERVICE:-restaurant-dashboard}"
CONTAINER="${CONTAINER:-nawyorders-restaurant-dashboard}"
IMAGE_TAG="${IMAGE_TAG:-local}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"

cd "$APP_DIR"

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "error: $APP_DIR/$COMPOSE_FILE is missing" >&2
  exit 1
fi

previous_image="$(docker inspect "$CONTAINER" --format '{{.Config.Image}}' 2>/dev/null || true)"
previous_tag=""
if [[ -n "$previous_image" ]]; then
  previous_tag="${previous_image##*:}"
fi

rollback() {
  if [[ -z "$previous_tag" || "$previous_tag" == "$IMAGE_TAG" ]]; then
    echo "warning: no previous image tag to roll back to" >&2
    return
  fi

  echo "==> Rolling back to $previous_tag" >&2
  # This is a dedicated, single-service compose project. --no-deps guarantees
  # that a failed dashboard deploy never recreates a shared service.
  IMAGE_TAG="$previous_tag" docker compose -f "$COMPOSE_FILE" up -d --no-deps --remove-orphans "$SERVICE" || true
}

fail_deploy() {
  local message="$1"
  echo "error: $message" >&2
  docker logs --tail 120 "$CONTAINER" >&2 || true
  rollback
  exit 1
}

echo "==> Building restaurant dashboard image $IMAGE_TAG"
IMAGE_TAG="$IMAGE_TAG" docker compose -f "$COMPOSE_FILE" build --pull "$SERVICE"

echo "==> Starting $CONTAINER"
if ! IMAGE_TAG="$IMAGE_TAG" docker compose -f "$COMPOSE_FILE" up -d --no-deps --remove-orphans "$SERVICE"; then
  fail_deploy "failed to start $CONTAINER"
fi

echo "==> Waiting for $CONTAINER to become healthy"
deadline=$((SECONDS + HEALTH_TIMEOUT))
while (( SECONDS < deadline )); do
  status="$(docker inspect "$CONTAINER" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then
    echo "==> $CONTAINER is healthy on image $IMAGE_TAG"
    exit 0
  fi
  if [[ "$status" == "unhealthy" || "$status" == "exited" || "$status" == "dead" ]]; then
    break
  fi
  sleep 3
done

fail_deploy "$CONTAINER did not become healthy within ${HEALTH_TIMEOUT}s"
