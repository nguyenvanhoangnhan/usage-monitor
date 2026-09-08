import { writeFile } from 'node:fs/promises'
import type { BrowserWindow } from 'electron'
import { is } from '@electron-toolkit/utils'
import { IPC } from '@shared/ipc-channels'

/**
 * Development-only helpers, all no-ops in production builds.
 * `USAGE_MONITOR_SCREENSHOT=/path.png` captures the window a few seconds after load,
 * `USAGE_MONITOR_WINDOW_SIZE=WxH` forces an initial size for layout checks,
 * `USAGE_MONITOR_OPEN_SETTINGS=1` opens the settings view once the renderer is ready.
 */
export function attachDevTools(win: BrowserWindow): void {
  if (!is.dev) return

  win.webContents.on('console-message', (event) => {
    const { level, message, lineNumber, sourceId } = event
    if (level === 'error' || level === 'warning') {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${lineNumber})`)
    }
  })

  const size = process.env.USAGE_MONITOR_WINDOW_SIZE?.match(/^(\d+)x(\d+)$/)
  if (size) {
    win.setSize(Number(size[1]), Number(size[2]))
    console.log(`[dev] window size forced to ${win.getSize().join('x')}`)
  }

  if (process.env.USAGE_MONITOR_OPEN_SETTINGS) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(() => win.webContents.send(IPC.appOpenSettings), 1500)
    })
  }

  const shot = process.env.USAGE_MONITOR_SCREENSHOT
  if (shot) {
    win.webContents.once('did-finish-load', () => {
      setTimeout(
        async () => {
          const image = await win.webContents.capturePage()
          await writeFile(shot, image.toPNG())
          console.log(`[dev] screenshot written to ${shot}`)
        },
        Number(process.env.USAGE_MONITOR_SCREENSHOT_DELAY ?? 4000)
      )
    })
  }
}
