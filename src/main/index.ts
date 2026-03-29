import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import log from './logger'
import { registerBoardHandlers } from './ipc/boards'
import { registerAnalyticsHandlers } from './ipc/analytics'
import { registerTicketHandlers } from './ipc/tickets'
import { registerSettingsHandlers } from './ipc/settings'
import { registerTemplateHandlers } from './ipc/templates'
import { registerLogHandlers } from './ipc/logs'
import icon from '../../resources/icon.png?asset'

// Ensure the Dock / taskbar always shows "Agile Life", not the Electron binary name
app.setName('Agile Life')

log.info('Agile Life starting up')

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    title: 'Agile Life',
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // During development, load from the Vite dev server.
  // In production, load from the built files.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // Set app user model id for Windows
  electronApp.setAppUserModelId('com.inspiration-particle.agile-life')

  // On macOS, BrowserWindow.icon does not change the Dock icon — set it explicitly
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(icon)
  }

  // Register IPC handlers
  registerBoardHandlers()
  registerAnalyticsHandlers()
  registerTicketHandlers()
  registerSettingsHandlers()
  registerTemplateHandlers()
  registerLogHandlers()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
