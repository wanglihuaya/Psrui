import { app, BrowserWindow, shell, ipcMain, dialog, Menu, type MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { BackendProcess } from './backend'
import { UpdateManager } from './updater'
import { type AppCommandId, isRendererOwnedCommand } from '../shared/commands'
import type { UpdateState } from '../shared/update'

const BACKEND_PORT = 8787
const windows = new Set<BrowserWindow>()
let backend: BackendProcess | null = null
let updater: UpdateManager | null = null

function getPrimaryWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow()
    ?? Array.from(windows).find((window) => !window.isDestroyed())
    ?? BrowserWindow.getAllWindows().find((window) => !window.isDestroyed())
    ?? null
}

function broadcastUpdateState(state: UpdateState): void {
  for (const window of windows) {
    if (!window.isDestroyed()) {
      window.webContents.send('updates:state', state)
    }
  }
}

function dispatchRendererCommand(commandId: AppCommandId): void {
  const window = getPrimaryWindow()
  if (!window) {
    createWindow()
    return
  }

  if (isRendererOwnedCommand(commandId)) {
    window.webContents.send('app:command', commandId)
    return
  }

  if (commandId === 'new-window') {
    createWindow()
  } else if (commandId === 'window-minimize') {
    window.minimize()
  } else if (commandId === 'window-toggle-full-screen') {
    window.setFullScreen(!window.isFullScreen())
  } else if (commandId === 'app-quit') {
    app.quit()
  }
}

function setApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = []

  if (process.platform === 'darwin') {
    template.push({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        {
          label: 'Check for Updates',
          click: () => dispatchRendererCommand('check-for-updates')
        },
        {
          label: 'Settings…',
          accelerator: 'CommandOrControl+,',
          click: () => dispatchRendererCommand('open-settings')
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })
  }

  template.push(
    {
      label: 'File',
      submenu: [
        { label: 'New Window', click: () => dispatchRendererCommand('new-window') },
        { type: 'separator' },
        { label: 'Open File', click: () => dispatchRendererCommand('open-file') },
        { label: 'Open Workspace', click: () => dispatchRendererCommand('open-workspace') },
        { label: 'Close File', click: () => dispatchRendererCommand('close-file') },
        { type: 'separator' },
        { label: 'Save Image', click: () => dispatchRendererCommand('save-image') },
        { label: 'Save Archive', click: () => dispatchRendererCommand('save-archive') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Profile', click: () => dispatchRendererCommand('view-profile') },
        { label: 'Freq × Phase', click: () => dispatchRendererCommand('view-waterfall') },
        { label: 'Time × Phase', click: () => dispatchRendererCommand('view-time-phase') },
        { label: 'Bandpass', click: () => dispatchRendererCommand('view-bandpass') },
        { label: 'PSRCAT', click: () => dispatchRendererCommand('view-psrcat') },
        { type: 'separator' },
        { label: 'Toggle Sidebar', click: () => dispatchRendererCommand('toggle-sidebar') },
        { label: 'Toggle Full Screen', click: () => dispatchRendererCommand('window-toggle-full-screen') }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', click: () => dispatchRendererCommand('window-minimize') },
        { role: 'zoom' },
        { role: 'front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Keyboard Shortcuts', click: () => dispatchRendererCommand('open-help') },
        { role: 'about' }
      ]
    }
  )

  if (is.dev) {
    template.push({
      label: 'Debug',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' }
      ]
    })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(filePath?: string): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0a0e17',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  windows.add(window)

  window.on('ready-to-show', () => {
    window.show()
    if (updater) {
      window.webContents.send('updates:state', updater.getState())
    }
    if (filePath) {
      window.webContents.send('file:open', filePath)
    }
  })

  window.on('closed', () => {
    windows.delete(window)
  })

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const url = is.dev && process.env['ELECTRON_RENDERER_URL']
    ? process.env['ELECTRON_RENDERER_URL']
    : join(__dirname, '../renderer/index.html')

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(url)
  } else {
    window.loadFile(url)
  }
}

function registerIPC(): void {
  ipcMain.handle('dialog:openFile', async (_, kind: 'archive' | 'calibration' | 'text' | 'any' = 'archive') => {
    const filters = kind === 'archive'
      ? [
          { name: 'Pulsar Archives', extensions: ['ar', 'fits', 'sf', 'rf', 'cf', 'pfd'] },
          { name: 'FITS Files', extensions: ['fits', 'fit'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      : kind === 'calibration'
        ? [
            { name: 'Calibration Files', extensions: ['cf', 'pcal', 'fcal', 'pfit', 'txt'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        : kind === 'text'
          ? [
              { name: 'Text Files', extensions: ['txt', 'tim', 'par', 'dat'] },
              { name: 'All Files', extensions: ['*'] }
            ]
          : [{ name: 'All Files', extensions: ['*'] }]

    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('backend:port', () => BACKEND_PORT)

  ipcMain.handle('backend:status', () => {
    return backend?.isRunning() ?? false
  })

  ipcMain.handle('backend:runtime', () => {
    return backend?.getRuntime() ?? 'local'
  })

  ipcMain.handle('backend:restart', async () => {
    await backend?.restart()
    return true
  })

  ipcMain.handle('window:new', (_, filePath?: string) => {
    createWindow(filePath)
  })

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle('window:toggleFullScreen', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (window) {
      window.setFullScreen(!window.isFullScreen())
    }
  })

  ipcMain.handle('app:quit', () => {
    app.quit()
  })

  ipcMain.handle('updates:getState', () => {
    return updater?.getState() ?? null
  })

  ipcMain.handle('updates:check', async () => {
    return updater ? await updater.checkForUpdates() : null
  })

  ipcMain.handle('updates:download', async () => {
    return updater ? await updater.downloadUpdate() : null
  })

  ipcMain.handle('updates:install', () => {
    return updater?.installUpdate() ?? null
  })

  ipcMain.handle('dialog:saveFile', async (_, defaultName: string, kind: 'image' | 'archive' | 'text' | 'any' = 'image') => {
    const filters = kind === 'image'
      ? [
          { name: 'PNG Image', extensions: ['png'] },
          { name: 'SVG Image', extensions: ['svg'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      : kind === 'archive'
        ? [
            { name: 'Pulsar Archive', extensions: ['ar', 'fits', 'rf', 'cf', 'pfd', 'processed'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        : kind === 'text'
          ? [
              { name: 'Text Files', extensions: ['txt', 'tim', 'par', 'dat'] },
              { name: 'All Files', extensions: ['*'] }
            ]
          : [{ name: 'All Files', extensions: ['*'] }]

    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters
    })
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('shell:showItemInFolder', (_, path: string) => {
    shell.showItemInFolder(path)
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.psrchive.viewer')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIPC()
  setApplicationMenu()

  backend = new BackendProcess(BACKEND_PORT)
  await backend.start()

  updater = new UpdateManager(broadcastUpdateState)
  updater.initialize()

  createWindow()
  updater.scheduleStartupCheck()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  backend?.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  backend?.stop()
})
