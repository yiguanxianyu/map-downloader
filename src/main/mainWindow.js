import { is } from '@electron-toolkit/utils'
import { BrowserWindow, Menu, app, shell } from 'electron'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { join } from 'path'

const _filename = fileURLToPath(import.meta.url)
const _dirname = dirname(_filename)
const icon = join(_dirname, '../../resources/icon.ico')

let mainWindow

const createWindow = () => {
  // TODO: Read args
  // const user = process.argv[2]

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: false,
    icon: icon,
    webPreferences: {
      preload: join(_dirname, '../preload/index.mjs'),
      sandbox: false,
      devTools: false // 禁用开发者工具
    }
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
    mainWindow.loadFile(join(_dirname, '../renderer/index.html'))
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
      // {
      //   label: '从shp-zip文件读取范围(仅EPSG:4326)',
      //   click: () => {
      //     const result = dialog.showOpenDialogSync({
      //       title: '选择文件',
      //       filters: [
      //         { name: 'Zip Files', extensions: ['zip'] },
      //         { name: 'GeoJSON Files', extensions: ['geojson'] }
      //       ],
      //       properties: ['openFile']
      //     })

      //     if (result !== undefined) {
      //       fs.readFile(result[0], async (err, data) => {
      //         const geojson = await shp(data)
      //         mainWindow.webContents.send('set-extent-from-shp', geojson)
      //       })
      //     }
      //   }
      // },
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

if (process.platform === 'darwin') {
  menuTemplate.unshift({
    label: app.getName(),
    submenu: [
      {
        role: 'Quit'
      }
    ]
  })
}

export { createWindow }
