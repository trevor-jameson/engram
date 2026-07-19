#!/usr/bin/env bash
# Tripwire for value duplication across context/ files.
# Owners per ai-workflow-rules.md §Keeping Docs in Sync — a fact's values
# may appear only in its owning file (learning-principles.md may cite
# scheduler values alongside rationale; specs/ are frozen unit specs).
# Not a prose-truth linter: it only catches known duplication signatures.
set -u
cd "$(dirname "$0")/.."

fail=0
report() { # $1 = description, $2 = offending matches (empty = pass)
  if [ -n "$2" ]; then
    echo "DRIFT: $1"
    printf '%s\n' "$2" | sed 's/^/  /'
    fail=1
  fi
}

ctx() { # grep across context/*.md excluding listed owner files
  local pattern=$1; shift
  local args=()
  for f in "$@"; do args+=(--exclude="$f"); done
  grep -rnE "$pattern" context --include='*.md' --exclude-dir=specs \
    --exclude='.init-adrian-state.md' "${args[@]}" || true
}

# Hex color values: only ui-context.md
report "hex color outside ui-context.md" \
  "$(ctx '#[0-9A-Fa-f]{6}' ui-context.md)"

# Leitner interval sequence: only project-overview (learning-principles may cite)
report "interval sequence outside project-overview.md" \
  "$(ctx '8, ?16, ?32, ?64' project-overview.md learning-principles.md)"

# Leech threshold: only project-overview (learning-principles may cite)
report "leech threshold outside project-overview.md" \
  "$(ctx '4\+? ?(lifetime )?lapses|lapses.*(reach|hit)e?s? 4' project-overview.md learning-principles.md)"

# Queue cap / floor values: only project-overview
report "queue cap/floor values outside project-overview.md" \
  "$(ctx 'cap (of |at )?25|floor(-as-fill)? (of |at )?5' project-overview.md learning-principles.md)"

# Definitional boundary restatement: "- `server/x/` — <definition>" list style
report "folder-boundary definition outside architecture.md" \
  "$(ctx '^- ."?(server/(vault|scheduler|api)|web|shared)/?. — ' architecture.md)"

# Frontmatter field-list restatement: only architecture.md (and overview's feature spec)
report "frontmatter field list outside architecture.md/project-overview.md" \
  "$(ctx 'box.{0,6}due.{0,6}lapses.{0,6}created.{0,6}source' architecture.md project-overview.md)"

# Retired files must stay retired
[ -e context/design-brief.md ] && { echo "DRIFT: context/design-brief.md has reappeared (retired 2026-07-19)"; fail=1; }

# Code side: hex colors belong in web/src/theme.ts only
if [ -d web/src ]; then
  report "hex color in web/src outside theme.ts" \
    "$(grep -rnE '#[0-9A-Fa-f]{6}' web/src --include='*.ts' --include='*.tsx' | grep -v 'web/src/theme.ts' || true)"
fi

if [ "$fail" -eq 0 ]; then
  echo "context drift check: OK"
else
  echo "context drift check: FAILED — fix by converting non-owner statements to pointers (ai-workflow-rules.md §Keeping Docs in Sync)"
fi
exit "$fail"
