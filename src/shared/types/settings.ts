import { z } from 'zod'
import { PROVIDER_IDS } from './usage'

export const LANGUAGES = ['en', 'vi'] as const
export type Language = (typeof LANGUAGES)[number]

export const trayItemSchema = z.object({
  provider: z.enum(PROVIDER_IDS),
  window: z.enum(['session', 'weekly'])
})

/**
 * Persisted app settings. `prefault` runs defaults through the schema so a
 * partially written settings file still yields a complete object.
 */
export const settingsSchema = z.object({
  language: z.enum(LANGUAGES).default('en'),
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  /** Whether big numbers show what is left or what was used. */
  displayMode: z.enum(['remaining', 'used']).default('remaining'),
  /** Card arrangement: `auto` switches to two columns when the window is wide enough. */
  layout: z.enum(['auto', 'stack', 'grid']).default('auto'),
  alwaysOnTop: z.boolean().default(false),
  claude: z
    .object({
      enabled: z.boolean().default(true),
      staleAfterMinutes: z.number().int().min(1).max(240).default(10)
    })
    .prefault({}),
  codex: z
    .object({
      enabled: z.boolean().default(true),
      pollIntervalSeconds: z.number().int().min(30).max(600).default(60)
    })
    .prefault({}),
  tray: z
    .object({
      enabled: z.boolean().default(true),
      items: z.array(trayItemSchema).default([
        { provider: 'claude', window: 'session' },
        { provider: 'codex', window: 'session' }
      ])
    })
    .prefault({}),
  windowBounds: z
    .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
    .optional()
})

export type AppSettings = z.infer<typeof settingsSchema>
export type TrayItem = z.infer<typeof trayItemSchema>

/** Deep partial used by `settings:update`; nested objects are merged, not replaced. */
export type SettingsPatch = {
  [K in keyof AppSettings]?: AppSettings[K] extends object
    ? Partial<AppSettings[K]>
    : AppSettings[K]
}

export const DEFAULT_SETTINGS: AppSettings = settingsSchema.parse({})
