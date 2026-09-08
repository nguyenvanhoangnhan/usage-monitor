import { EventEmitter } from 'node:events'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import {
  DEFAULT_SETTINGS,
  settingsSchema,
  type AppSettings,
  type SettingsPatch
} from '@shared/types/settings'

export interface SettingsStoreEvents {
  change: [settings: AppSettings, previous: AppSettings]
}

/**
 * JSON-file backed settings with schema validation and atomic writes.
 * A corrupt or partial file degrades to defaults instead of crashing startup.
 */
export class SettingsStore extends EventEmitter<SettingsStoreEvents> {
  private current: AppSettings
  /** True when no settings file existed at startup (first run). */
  readonly fresh: boolean

  constructor(private readonly filePath: string) {
    super()
    const loaded = this.load()
    this.current = loaded.settings
    this.fresh = loaded.fresh
  }

  get(): AppSettings {
    return this.current
  }

  update(patch: SettingsPatch): AppSettings {
    const previous = this.current
    const merged = mergePatch(previous, patch)
    const parsed = settingsSchema.safeParse(merged)
    if (!parsed.success) {
      return previous
    }
    this.current = parsed.data
    this.persist()
    this.emit('change', this.current, previous)
    return this.current
  }

  private load(): { settings: AppSettings; fresh: boolean } {
    try {
      const raw = JSON.parse(readFileSync(this.filePath, 'utf8'))
      const parsed = settingsSchema.safeParse(raw)
      return { settings: parsed.success ? parsed.data : DEFAULT_SETTINGS, fresh: false }
    } catch (error) {
      const missing = (error as NodeJS.ErrnoException).code === 'ENOENT'
      return { settings: DEFAULT_SETTINGS, fresh: missing }
    }
  }

  private persist(): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    const tmp = `${this.filePath}.tmp`
    writeFileSync(tmp, JSON.stringify(this.current, null, 2))
    renameSync(tmp, this.filePath)
  }
}

function mergePatch(base: AppSettings, patch: SettingsPatch): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    const baseValue = (base as Record<string, unknown>)[key]
    if (isPlainObject(value) && isPlainObject(baseValue)) {
      out[key] = { ...baseValue, ...value }
    } else {
      out[key] = value
    }
  }
  return out
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
