#!/bin/bash
# Post-edit hook: runs eslint + tsc and feeds errors back to Claude

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Skip if no file path or not a TS/JS file
if [[ -z "$FILE_PATH" ]] || ! [[ "$FILE_PATH" =~ \.(ts|tsx|js|jsx)$ ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0

ERRORS=""

# Run eslint on the edited file
LINT_OUTPUT=$(npx eslint "$FILE_PATH" 2>&1 || true)
if echo "$LINT_OUTPUT" | grep -qE "[0-9]+ error"; then
  ERRORS="ESLint errors in $FILE_PATH:\n$LINT_OUTPUT"
fi

# Run typecheck (needs typegen first for React Router)
npx react-router typegen 2>/dev/null
TYPE_OUTPUT=$(npx tsc --noEmit 2>&1 || true)
if echo "$TYPE_OUTPUT" | grep -q "error TS"; then
  ERRORS="$ERRORS\n\nTypeScript errors:\n$TYPE_OUTPUT"
fi

if [[ -n "$ERRORS" ]]; then
  jq -n \
    --arg reason "Lint/typecheck errors detected — fix before continuing" \
    --arg context "$(printf '%b' "$ERRORS")" \
    '{
      "decision": "block",
      "reason": $reason,
      "hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "additionalContext": $context
      }
    }'
fi

exit 0
