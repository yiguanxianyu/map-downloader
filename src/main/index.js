const path = require('path')

import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import prompt from 'electron-prompt'
import { exec } from 'child_process'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  ipcMain.on('downloadMap', (event, zoom, extent) => {
    downloadMap(zoom, extent)
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

const showNote = (type, title, body) => {
  dialog.showMessageBoxSync(null, {
    type: type,
    buttons: ['Ok'],
    defaultId: 0,
    cancelId: 0,
    message: body,
    title: title
  })
}

const downloadMap = (zoom, extent) => {
  const prompt_config = {
    title: '缩放等级',
    label: '请输入缩放等级',
    type: 'input',
    value: zoom,
    inputAttrs: { type: 'text', required: true },
    height: 150
  }

  prompt(prompt_config)
    .then((r) => {
      if (r === null) {
        console.log('user cancelled')
      } else {
        zoom = parseInt(r)

        if (isNaN(zoom) || zoom < 6 || zoom > 18) {
          showNote('error', 'error', '请输入正确的数字')
          return
        }

        const output_path = dialog.showSaveDialogSync({
          title: '保存',
          defaultPath: path.join(app.getPath('downloads'), 'output.tif'),
          filters: [
            {
              name: 'GeoTIFF',
              extensions: ['tif', 'tiff', 'geotiff']
            }
          ]
        })
        if (!output_path) return

        const full_command = [
          import.meta.env.MAIN_VITE_PYTHON_ACTIVATE_PATH,
          '&',
          'python',
          import.meta.env.MAIN_VITE_PYTHON_SCRIPT_PATH,
          output_path,
          zoom,
          extent[0],
          extent[1],
          extent[2],
          extent[3]
        ].join(' ')

        exec(full_command, (error, stdout, stderr) => {
          if (error) showNote('error', 'error', error)
          else if (stderr) showNote('error', 'stderr', stderr)
          else showNote('info', 'stdout', stdout)
        })
      }
    })
    .catch(console.error)
}
