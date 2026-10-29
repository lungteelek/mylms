#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SYSTEMD_DIR="$ROOT_DIR/deploy/systemd"

SERVICES=(
  mylms-backend
  mylms-backend-nest
  mylms-media-worker
  mylms-educator-web
  mylms-student-web
)

usage() {
  cat <<'EOF'
Usage:
  sudo bash scripts/manage-services.sh install
  sudo bash scripts/manage-services.sh restart
  sudo bash scripts/manage-services.sh status

This installs the systemd unit files from deploy/systemd, reloads systemd,
and starts the production services in the correct order.
EOF
}

copy_unit() {
  local name="$1"
  local src="$SYSTEMD_DIR/$name.service"
  local dst="/etc/systemd/system/$name.service"

  if [[ ! -f "$src" ]]; then
    echo "Missing unit file: $src" >&2
    exit 1
  fi

  cp "$src" "$dst"
}

install_units() {
  for service in "${SERVICES[@]}"; do
    copy_unit "$service"
  done

  systemctl daemon-reload

  for service in "${SERVICES[@]}"; do
    systemctl enable "$service"
  done

  for service in "${SERVICES[@]}"; do
    systemctl start "$service"
  done
}

restart_units() {
  systemctl restart "${SERVICES[@]}"
}

status_units() {
  systemctl status "${SERVICES[@]}" --no-pager
}

main() {
  local cmd="${1:-}"

  case "$cmd" in
    install)
      install_units
      ;;
    restart)
      restart_units
      ;;
    status)
      status_units
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
