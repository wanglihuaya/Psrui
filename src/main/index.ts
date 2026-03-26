import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { BackendProcess } from './backend'

const BACKEND_PORT = 8787
const windows = new Set<BrowserWindow>()
let backend: BackendProcess | null = null

function createWindow(filePath?: string): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 7 },
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
  ipcMain.handle('dialog:openFile', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Pulsar Archives', extensions: ['ar', 'fits', 'sf', 'rf', 'cf', 'pfd'] },
        { name: 'FITS Files', extensions: ['fits', 'fit'] },
        { name: 'All Files', extensions: ['*'] }
      ]
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

  ipcMain.handle('backend:restart', async () => {
    await backend?.restart()
    return true
  })

  ipcMain.handle('window:new', (_, filePath?: string) => {
    createWindow(filePath)
  })

  ipcMain.handle('dialog:saveFile', async (_, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [
        { name: 'PNG Image', extensions: ['png'] },
        { name: 'SVG Image', extensions: ['svg'] },
        { name: 'All Files', extensions: ['*'] }
      ]
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

  backend = new BackendProcess(BACKEND_PORT)
  await backend.start()

  createWindow()

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
