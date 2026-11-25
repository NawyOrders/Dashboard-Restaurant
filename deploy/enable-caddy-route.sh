#!/usr/bin/env bash
#
# Add the restaurant dashboard route to the shared Caddy instance, but only
# after the dashboard container is known healthy. This script is idempotent and
# deliberately edits the bind-mounted Caddyfile in place (never mv/rename).

set -euo pipefail

CADDY_CONTAINER="${CADDY_CONTAINER:-genmarka-caddy-1}"
CADDYFILE="${CADDYFILE:-/opt/genmarka/Caddyfile}"
DASHBOARD_CONTAINER="${DASHBOARD_CONTAINER:-nawyorders-restaurant-dashboard}"
ROUTE_MARKER="# nawyorders-restaurant-dashboard"

if [[ "$(docker inspect "$DASHBOARD_CONTAINER" --format '{{if .State.Health}}{{.State.Health.Status}}{{end}}' 2>/dev/null || true)" != "healthy" ]]; then
  echo "error: $DASHBOARD_CONTAINER is not healthy; refusing to change Caddy" >&2
  exit 1
fi

if grep -Fqx "$ROUTE_MARKER" "$CADDYFILE"; then
  echo "==> Caddy route is already present"
  exit 0
fi

backup="${CADDYFILE}.bak.$(date +%Y%m%d%H%M%S)"
cp -a "$CADDYFILE" "$backup"

# Append instead of replacing the file so the bind mount keeps its inode.
cat >> "$CADDYFILE" <<'EOF'

# nawyorders-restaurant-dashboard
# The bare admin host does not identify a restaurant. Return an empty 404
# rather than proxying it to a tenant API or exposing a tenant slug.
admin.nawyorders.com {
	tls {
		on_demand
	}
	respond "" 404
}

*.admin.nawyorders.com {
	tls {
		on_demand
	}
	reverse_proxy nawyorders-restaurant-dashboard:8080
}
EOF

restore_backup() {
  cat "$backup" > "$CADDYFILE"
}

if ! docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile; then
  restore_backup
  echo "error: Caddy configuration validation failed; restored $CADDYFILE from $backup" >&2
  exit 1
fi

if ! docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile; then
  restore_backup
  # Return Caddy's bind-mounted configuration to the known-good version too.
  docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile || true
  echo "error: Caddy reload failed; restored $CADDYFILE from $backup" >&2
  exit 1
fi

echo "==> Enabled *.admin.nawyorders.com via $DASHBOARD_CONTAINER:8080"
