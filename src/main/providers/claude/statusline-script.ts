export interface StatuslineScriptOptions {
  dataFilePath: string
  /** A statusline command that existed before ours; it receives the same stdin and owns the output. */
  chainCommand?: string | null
}

/** Marker line the installer looks for to recognise its own script. */
export const SCRIPT_MARKER = '# usage-monitor-statusline v1'

/**
 * POSIX sh script installed as Claude Code's statusline command.
 * It saves the incoming JSON atomically, then either forwards stdin to a
 * previously configured command or prints a compact summary with jq.
 */
export function buildStatuslineScript(options: StatuslineScriptOptions): string {
  const chain = options.chainCommand?.trim() ?? ''
  return `#!/bin/sh
${SCRIPT_MARKER}
# Installed by Usage Monitor. Saves the statusline JSON so the app can read rate limits.
DATA_FILE=${shellQuote(options.dataFilePath)}
CHAIN_COMMAND=${shellQuote(chain)}

input=$(cat)
mkdir -p "$(dirname "$DATA_FILE")" 2>/dev/null
tmp="$DATA_FILE.tmp.$$"
if printf '%s' "$input" > "$tmp" 2>/dev/null; then
  mv -f "$tmp" "$DATA_FILE" 2>/dev/null
fi

if [ -n "$CHAIN_COMMAND" ]; then
  printf '%s' "$input" | sh -c "$CHAIN_COMMAND"
  exit $?
fi

if command -v jq >/dev/null 2>&1; then
  printf '%s' "$input" | jq -r '
    [ (.model.display_name // "Claude"),
      (.rate_limits.five_hour.used_percentage // empty | "5h \\(round)%"),
      (.rate_limits.seven_day.used_percentage // empty | "wk \\(round)%") ]
    | join("  ")'
else
  printf 'Claude\\n'
fi
`
}

/** Single-quote for sh, escaping embedded single quotes. */
export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}
