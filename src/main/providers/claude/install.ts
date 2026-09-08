import { chmod, copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { ClaudeInstallResult, ClaudeSetupStatus } from '@shared/types/setup'
import type { ClaudePaths } from './paths'
import { buildStatuslineScript } from './statusline-script'

interface ClaudeSettingsFile {
  statusLine?: { type?: string; command?: string; padding?: number } & Record<string, unknown>
  [key: string]: unknown
}

type ReadSettingsResult =
  | { ok: true; settings: ClaudeSettingsFile; existed: boolean }
  | {
      ok: false
      errorKey: 'claude.settingsUnreadable' | 'claude.settingsInvalidJson'
      detail: string
    }

async function readClaudeSettings(path: string): Promise<ReadSettingsResult> {
  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ok: true, settings: {}, existed: false }
    }
    return { ok: false, errorKey: 'claude.settingsUnreadable', detail: String(error) }
  }
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, errorKey: 'claude.settingsInvalidJson', detail: 'root is not an object' }
    }
    return { ok: true, settings: parsed as ClaudeSettingsFile, existed: true }
  } catch (error) {
    return { ok: false, errorKey: 'claude.settingsInvalidJson', detail: String(error) }
  }
}

function isOurCommand(command: string | undefined, scriptPath: string): boolean {
  return typeof command === 'string' && command.includes(scriptPath)
}

async function readChainCommand(hookMetaPath: string): Promise<string | null> {
  try {
    const meta = JSON.parse(await readFile(hookMetaPath, 'utf8'))
    return typeof meta?.chainCommand === 'string' && meta.chainCommand ? meta.chainCommand : null
  } catch {
    return null
  }
}

async function fileMtime(path: string): Promise<number | null> {
  try {
    return (await stat(path)).mtimeMs
  } catch {
    return null
  }
}

/** Reports whether the hook is wired up and whether data has started flowing. */
export async function getClaudeSetupStatus(paths: ClaudePaths): Promise<ClaudeSetupStatus> {
  const read = await readClaudeSettings(paths.settingsPath)
  const command = read.ok ? read.settings.statusLine?.command : undefined
  const installed = isOurCommand(command, paths.scriptPath)
  const dataUpdatedAt = await fileMtime(paths.dataFilePath)
  return {
    settingsPath: paths.settingsPath,
    scriptPath: paths.scriptPath,
    dataFilePath: paths.dataFilePath,
    installed,
    existingCommand: installed
      ? await readChainCommand(paths.hookMetaPath)
      : command?.trim()
        ? command
        : null,
    dataFileExists: dataUpdatedAt !== null,
    dataFileUpdatedAt: dataUpdatedAt
  }
}

/**
 * Writes the hook script and points `statusLine.command` at it.
 * The settings file is backed up first; a pre-existing command is chained so it keeps working.
 */
export async function installClaudeStatusline(paths: ClaudePaths): Promise<ClaudeInstallResult> {
  const read = await readClaudeSettings(paths.settingsPath)
  if (!read.ok) return { ok: false, errorKey: read.errorKey, detail: read.detail }

  const currentCommand = read.settings.statusLine?.command
  const chainCommand = isOurCommand(currentCommand, paths.scriptPath)
    ? await readChainCommand(paths.hookMetaPath)
    : currentCommand?.trim() || null

  try {
    await mkdir(dirname(paths.scriptPath), { recursive: true })
    await writeFile(
      paths.scriptPath,
      buildStatuslineScript({ dataFilePath: paths.dataFilePath, chainCommand }),
      'utf8'
    )
    await chmod(paths.scriptPath, 0o755)
    await writeFile(paths.hookMetaPath, JSON.stringify({ chainCommand }, null, 2), 'utf8')
  } catch (error) {
    return { ok: false, errorKey: 'claude.writeFailed', detail: String(error) }
  }

  let backupPath: string | undefined
  try {
    await mkdir(dirname(paths.settingsPath), { recursive: true })
    if (read.existed) {
      backupPath = `${paths.settingsPath}.bak-${timestamp()}`
      await copyFile(paths.settingsPath, backupPath)
    }
    const next: ClaudeSettingsFile = {
      ...read.settings,
      statusLine: {
        ...(read.settings.statusLine ?? {}),
        type: 'command',
        command: paths.scriptPath
      }
    }
    const tmp = `${paths.settingsPath}.tmp`
    await writeFile(tmp, JSON.stringify(next, null, 2) + '\n', 'utf8')
    await rename(tmp, paths.settingsPath)
  } catch (error) {
    return { ok: false, errorKey: 'claude.writeFailed', detail: String(error) }
  }

  return { ok: true, backupPath }
}

/** Snippet shown for manual setup, kept in one place so UI and installer agree. */
export function manualSettingsSnippet(paths: ClaudePaths): string {
  return JSON.stringify({ statusLine: { type: 'command', command: paths.scriptPath } }, null, 2)
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}
