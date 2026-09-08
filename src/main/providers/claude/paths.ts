import { homedir } from 'node:os'
import { join } from 'node:path'

export interface ClaudePaths {
  /** `~/.claude/settings.json`, or `$CLAUDE_CONFIG_DIR/settings.json` when set. */
  settingsPath: string
  /** Shell script installed as the statusline command. */
  scriptPath: string
  /** JSON written by the script on every statusline tick. */
  dataFilePath: string
  /** Small sidecar remembering a chained pre-existing statusline command. */
  hookMetaPath: string
}

export function resolveClaudePaths(env: NodeJS.ProcessEnv = process.env): ClaudePaths {
  const home = homedir()
  const claudeDir = env.CLAUDE_CONFIG_DIR?.trim() || join(home, '.claude')
  const configRoot = env.XDG_CONFIG_HOME?.trim() || join(home, '.config')
  const dataDir = join(configRoot, 'usage-monitor')
  return {
    settingsPath: join(claudeDir, 'settings.json'),
    scriptPath: join(dataDir, 'claude-statusline.sh'),
    dataFilePath: join(dataDir, 'claude-statusline.json'),
    hookMetaPath: join(dataDir, 'claude-hook.json')
  }
}
