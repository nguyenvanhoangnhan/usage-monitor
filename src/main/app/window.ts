import { BrowserWindow, shell } from 'electron'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import type { AppSettings } from '@shared/types/settings'
import { attachDevTools } from './dev-tools'

export interface MainWindowCallbacks {
  onBoundsChanged(bounds: Electron.Rectangle): void
}

const DEFAULT_SIZE = { width: 480, height: 640 }
const MIN_SIZE = { width: 320, height: 400 }

/** Wraps the single app window: frameless-ish titlebar, hide-on-close, persisted bounds. */
export class MainWindowController {
  private window: BrowserWindow | null = null
  private quitting = false

  constructor(private readonly callbacks: MainWindowCallbacks) {}

  create(settings: AppSettings): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) return this.window

    const bounds = settings.windowBounds
    const win = new BrowserWindow({
      ...(bounds ?? DEFAULT_SIZE),
      minWidth: MIN_SIZE.width,
      minHeight: MIN_SIZE.height,
      show: false,
      alwaysOnTop: settings.alwaysOnTop,
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 14 },
      backgroundColor: '#FAF9F5',
      autoHideMenuBar: true,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    })

    attachDevTools(win)
    win.on('ready-to-show', () => win.show())
    win.on('close', (event) => {
      if (this.quitting) return
      event.preventDefault()
      win.hide()
    })
    const saveBounds = (): void => {
      if (!win.isDestroyed()) this.callbacks.onBoundsChanged(win.getBounds())
    }
    win.on('resize', debounce(saveBounds, 300))
    win.on('move', debounce(saveBounds, 300))
    win.webContents.setWindowOpenHandler((details) => {
      void shell.openExternal(details.url)
      return { action: 'deny' }
    })

    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      void win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      void win.loadFile(join(__dirname, '../renderer/index.html'))
    }

    this.window = win
    return win
  }

  get(): BrowserWindow | null {
    return this.window && !this.window.isDestroyed() ? this.window : null
  }

  show(settings: AppSettings): void {
    const win = this.create(settings)
    if (win.isMinimized()) win.restore()
    win.show()
    win.focus()
  }

  setAlwaysOnTop(value: boolean): void {
    this.get()?.setAlwaysOnTop(value, 'floating')
  }

  send(channel: string, payload: unknown): void {
    this.get()?.webContents.send(channel, payload)
  }

  markQuitting(): void {
    this.quitting = true
  }
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: NodeJS.Timeout | null = null
  return () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(fn, ms)
  }
}
