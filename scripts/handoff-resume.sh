#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$ROOT_DIR/docs"

echo "Resume checklist"
echo "1. Read docs/NEXT.md"
echo "2. Read docs/LAST_SESSION.md"
echo "3. Start services with: npm run demo:start"
echo "4. If git is available, inspect: git status --short && git log --oneline -5"
echo

if [[ -f "$DOCS_DIR/NEXT.md" ]]; then
  echo "----- docs/NEXT.md -----"
  cat "$DOCS_DIR/NEXT.md"
  echo
fi

if [[ -f "$DOCS_DIR/LAST_SESSION.md" ]]; then
  echo "----- docs/LAST_SESSION.md -----"
  cat "$DOCS_DIR/LAST_SESSION.md"
fi

