#!/usr/bin/env bash
# 세션 시작 시 output-clarity 규칙을 additionalContext로 주입.
# ~/.claude/rules/common/output-clarity.md가 이미 있으면 중복 주입을 건너뜀.

RULES_FILE="$HOME/.claude/rules/common/output-clarity.md"

if [ -f "$RULES_FILE" ]; then
  # 이미 규칙 파일이 로드되어 있음 — 중복 주입 불필요
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart"}}\n'
  exit 0
fi

RULES_CONTENT=$(cat "$CLAUDE_PLUGIN_ROOT/rules/output-clarity.md" 2>/dev/null || echo "")

if [ -z "$RULES_CONTENT" ]; then
  printf '{"hookSpecificOutput":{"hookEventName":"SessionStart"}}\n'
  exit 0
fi

# JSON 이스케이프 (newline → \n, quote → \", backslash → \\)
ESCAPED=$(printf '%s' "$RULES_CONTENT" | python3 -c "
import sys, json
content = sys.stdin.read()
print(json.dumps(content)[1:-1])
")

printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$ESCAPED"
exit 0
