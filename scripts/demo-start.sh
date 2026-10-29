#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
NEST_DIR="$ROOT_DIR/backend-nest"
RUN_DIR="$ROOT_DIR/.codex/run"
BACKEND_PID_FILE="$RUN_DIR/backend.pid"
NEST_PID_FILE="$RUN_DIR/backend-nest.pid"
BACKEND_LOG="$RUN_DIR/backend.log"
NEST_LOG="$RUN_DIR/backend-nest.log"

mkdir -p "$RUN_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

wait_for_port() {
  local host="$1"
  local port="$2"
  local name="$3"
  local attempts=40

  for ((i = 1; i <= attempts; i += 1)); do
    if bash -lc "exec 3<>/dev/tcp/$host/$port" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done

  echo "$name did not become ready on $host:$port" >&2
  return 1
}

stop_if_running() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  fi
}

stop_matching_processes() {
  local pattern="$1"
  local pids
  pids="$(pgrep -f "$pattern" || true)"
  if [[ -z "$pids" ]]; then
    return 0
  fi

  kill $pids >/dev/null 2>&1 || true
  sleep 1

  local survivors
  survivors="$(pgrep -f "$pattern" || true)"
  if [[ -n "$survivors" ]]; then
    kill -9 $survivors >/dev/null 2>&1 || true
  fi
}

require_cmd npm
require_cmd npx
mkdir -p "$BACKEND_DIR/data"

stop_if_running "$BACKEND_PID_FILE"
stop_if_running "$NEST_PID_FILE"
stop_matching_processes '/home/mylms/mylms_project/backend/dist/index.js'
stop_matching_processes 'ts-node src/index.ts'
stop_matching_processes '/home/mylms/mylms_project/backend-nest/dist/main.js'
stop_matching_processes 'ts-node src/main.ts'

echo "Syncing Prisma schema..."
(cd "$BACKEND_DIR" && npx prisma db push --accept-data-loss >/dev/null)

echo "Seeding demo data..."
(cd "$BACKEND_DIR" && npx ts-node prisma/seed.ts >/dev/null)

echo "Building Nest API..."
(cd "$NEST_DIR" && npm run build >/dev/null)

echo "Starting Express backend..."
(
  cd "$BACKEND_DIR"
  exec npm run start
) >"$BACKEND_LOG" 2>&1 &
echo $! >"$BACKEND_PID_FILE"

echo "Starting Nest backend..."
(
  cd "$NEST_DIR"
  exec npm run start
) >"$NEST_LOG" 2>&1 &
echo $! >"$NEST_PID_FILE"

wait_for_port 127.0.0.1 3000 "Express backend"
wait_for_port 127.0.0.1 3001 "Nest backend"

echo "Demo stack is ready."
echo "Admin:  http://localhost:3000/admin-app.html"
echo "Student: http://localhost:3000/student-app.html"
echo "Express log: $BACKEND_LOG"
echo "Nest log:    $NEST_LOG"
