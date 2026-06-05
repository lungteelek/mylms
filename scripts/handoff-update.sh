#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$ROOT_DIR/docs"
RUN_DIR="$ROOT_DIR/.codex/run"
SNAPSHOT_FILE="$DOCS_DIR/LAST_SESSION.md"
NEXT_FILE="$DOCS_DIR/NEXT.md"

mkdir -p "$DOCS_DIR"

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

git_or_default() {
  local cmd="$1"
  local fallback="$2"
  if has_cmd git && git -C "$ROOT_DIR" rev-parse --show-toplevel >/dev/null 2>&1; then
    eval "$cmd" 2>/dev/null || printf '%s' "$fallback"
  else
    printf '%s' "$fallback"
  fi
}

process_state() {
  local pid_file="$1"
  local label="$2"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      printf '%s:running(pid=%s)' "$label" "$pid"
      return 0
    fi
    printf '%s:stale-pid' "$label"
    return 0
  fi
  printf '%s:stopped' "$label"
}

update_next_auto_snapshot() {
  [[ -f "$NEXT_FILE" ]] || return 0

  local branch status_line backend_state nest_state generated
  generated="$(date '+%Y-%m-%d %H:%M:%S %Z')"
  branch="$(git_or_default "git -C \"$ROOT_DIR\" branch --show-current" "unavailable")"
  status_line="$(git_or_default "git -C \"$ROOT_DIR\" status --short | head -n 5" "unavailable")"
  status_line="$(printf '%s' "$status_line" | tr '\n' ';' | sed 's/;*$//')"
  [[ -n "$status_line" ]] || status_line="clean-or-unavailable"
  backend_state="$(process_state "$RUN_DIR/backend.pid" "express")"
  nest_state="$(process_state "$RUN_DIR/backend-nest.pid" "nest")"

  python3 - "$NEXT_FILE" "$generated" "$branch" "$status_line" "$backend_state" "$nest_state" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
generated, branch, status_line, backend_state, nest_state = sys.argv[2:]
text = path.read_text()
start = "<!-- AUTO-SNAPSHOT:START -->"
end = "<!-- AUTO-SNAPSHOT:END -->"
block = "\n".join([
    start,
    f"- generated: {generated}",
    f"- branch: {branch}",
    f"- git status: {status_line}",
    f"- services: {backend_state}, {nest_state}",
    "- demo urls: http://localhost:3000/admin-app.html , http://localhost:3000/student-app.html",
    end,
])
if start in text and end in text:
    before = text.split(start, 1)[0]
    after = text.split(end, 1)[1]
    path.write_text(before + block + after)
else:
    path.write_text(text.rstrip() + "\n\n## Auto Snapshot\n\n" + block + "\n")
PY
}

append_section() {
  local title="$1"
  printf '\n## %s\n\n' "$title" >>"$SNAPSHOT_FILE"
}

append_block() {
  local label="$1"
  local cmd="$2"
  printf '### %s\n\n```text\n' "$label" >>"$SNAPSHOT_FILE"
  if eval "$cmd" >>"$SNAPSHOT_FILE" 2>&1; then
    :
  else
    printf '[command failed]\n' >>"$SNAPSHOT_FILE"
  fi
  printf '```\n' >>"$SNAPSHOT_FILE"
}

{
  printf '# Last Session Snapshot\n\n'
  printf 'Generated: %s\n\n' "$(date '+%Y-%m-%d %H:%M:%S %Z')"
  printf 'Project root: `%s`\n\n' "$ROOT_DIR"
} >"$SNAPSHOT_FILE"

update_next_auto_snapshot

append_section "Checklist"
cat >>"$SNAPSHOT_FILE" <<'EOF'
- [ ] อัปเดต `docs/NEXT.md`
- [ ] commit / push งานล่าสุด
- [ ] ระบุ blocker ถ้ามี
EOF

append_section "Repo State"
if has_cmd git && git -C "$ROOT_DIR" rev-parse --show-toplevel >/dev/null 2>&1; then
  append_block "Branch" "git -C \"$ROOT_DIR\" branch --show-current"
  append_block "Status" "git -C \"$ROOT_DIR\" status --short"
  append_block "Recent Commits" "git -C \"$ROOT_DIR\" log --oneline -5"
else
  printf 'Git metadata is unavailable from this environment.\n' >>"$SNAPSHOT_FILE"
fi

append_section "Run State"
if [[ -d "$RUN_DIR" ]]; then
  append_block "Run Directory" "find \"$RUN_DIR\" -maxdepth 1 -type f | sort"
  if [[ -f "$RUN_DIR/backend.pid" ]]; then
    append_block "Backend PID" "cat \"$RUN_DIR/backend.pid\""
  fi
  if [[ -f "$RUN_DIR/backend-nest.pid" ]]; then
    append_block "Nest PID" "cat \"$RUN_DIR/backend-nest.pid\""
  fi
else
  printf 'No runtime directory found.\n' >>"$SNAPSHOT_FILE"
fi

append_section "Recent Logs"
if [[ -f "$RUN_DIR/backend.log" ]]; then
  append_block "Express Tail" "tail -n 30 \"$RUN_DIR/backend.log\""
fi
if [[ -f "$RUN_DIR/backend-nest.log" ]]; then
  append_block "Nest Tail" "tail -n 30 \"$RUN_DIR/backend-nest.log\""
fi

append_section "Next File"
if [[ -f "$DOCS_DIR/NEXT.md" ]]; then
  append_block "NEXT.md" "cat \"$DOCS_DIR/NEXT.md\""
else
  printf '`docs/NEXT.md` is missing.\n' >>"$SNAPSHOT_FILE"
fi

echo "Wrote $SNAPSHOT_FILE"
