import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildStatuslineScript } from './statusline-script'

/** Runs the generated script under /bin/sh the way Claude Code would. */
function runScript(script: string, stdin: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'usage-monitor-'))
  const path = join(dir, 'statusline.sh')
  writeFileSync(path, script)
  chmodSync(path, 0o755)
  return execFileSync('/bin/sh', [path], { input: stdin, encoding: 'utf8' })
}

describe('statusline script (integration)', () => {
  const payload = JSON.stringify({
    model: { display_name: 'Opus' },
    rate_limits: { five_hour: { used_percentage: 42.4 }, seven_day: { used_percentage: 17 } }
  })

  it('writes stdin to the data file atomically and prints a summary', () => {
    const dir = mkdtempSync(join(tmpdir(), 'usage-monitor-data-'))
    const dataFilePath = join(dir, 'nested', 'claude-statusline.json')
    const out = runScript(buildStatuslineScript({ dataFilePath }), payload)

    expect(JSON.parse(readFileSync(dataFilePath, 'utf8'))).toEqual(JSON.parse(payload))
    expect(out.trim()).toMatch(/^Opus/)
    expect(out).toContain('5h 42%')
  })

  it('forwards stdin to a chained command and returns its output', () => {
    const dir = mkdtempSync(join(tmpdir(), 'usage-monitor-data-'))
    const dataFilePath = join(dir, 'claude-statusline.json')
    const out = runScript(
      buildStatuslineScript({ dataFilePath, chainCommand: "sed 's/.*/chained/'" }),
      payload
    )
    expect(out.trim()).toBe('chained')
    expect(readFileSync(dataFilePath, 'utf8')).toBe(payload)
  })
})
