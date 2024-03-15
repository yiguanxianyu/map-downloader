import { is } from '@electron-toolkit/utils'
import axios from 'axios'
import { BrowserWindow, Menu, ipcMain, shell } from 'electron'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { join } from 'path'

// import icon from '../../resources/icon.png?asset'
import { downloadMap } from './downloadMap.js'

const _filename = fileURLToPath(import.meta.url)
const _dirname = dirname(_filename)
const icon = join(_dirname, '../../resources/icon.png')

let mainWindow

const createWindow = () => {
  // TODO: Read args
  // const user = process.argv[2]

  // Create the browser window.
  const mw = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(_dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow = mw

  mw.on('ready-to-show', () => {
    mw.show()
  })

  mw.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mw.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mw.loadFile(join(_dirname, '../renderer/index.html'))
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))
}

const menuTemplate = [
  {
    label: '下载',
    click: () => {
      mainWindow.webContents.send('on-download-map')
    }
  },
  {
    label: '空间范围',
    submenu: [
      {
        label: '将当前视图设置为下载范围',
        click: () => {
          mainWindow.webContents.send('set-extent-current-view')
        }
      },
      {
        label: '从shp读取范围',
        enabled: false
      },
      {
        label: '按住shift在地图上勾画范围',
        enabled: false
      },
      {
        label: '按住shift+鼠标左键单击清除范围',
        enabled: false
      }
    ]
  }
]

ipcMain.on('download-map', (event, configs, extent) => {
  downloadMap(configs, extent)
})

ipcMain.handle('get-url', async (event, url) => {
  try {
    const response = await axios.get(url)
    // 处理成功情况
    return response.data
  } catch {
    console.log('failed')
  }
})

ipcMain.handle('get-caps-result', async (event, item) => {
  const url = item.url
  const token = item.token_server
  try {
    const response = await axios.get(url, {
      params: {
        tk: token
      }
    })
    // 处理成功情况
    return response.data
  } catch (err) {
    console.log(err)
    return -1
  }
})

export { createWindow, mainWindow }
