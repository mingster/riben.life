#!/usr/bin/env bash
# Symlink ~/.agents/skills into the repo so agents and tools that only search the
# workspace can still resolve user skills. Safe to re-run.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${HOME}/.agents/skills"
LINK="${ROOT}/.agents/skills-global"
if [[ ! -d "$TARGET" ]]; then
	echo "error: missing directory: $TARGET" >&2
	echo "Create it or install skills there first." >&2
	exit 1
fi
mkdir -p "$(dirname "$LINK")"
rm -f "$LINK"
ln -sfn "$TARGET" "$LINK"
echo "Linked: $LINK -> $TARGET"
