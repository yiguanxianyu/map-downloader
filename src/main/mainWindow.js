import { shell, BrowserWindow, Menu, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getCurrentToken, updateToken } from './utils'

let mainWindow

const createWindow = () => {
    // TODO: Read args
    // const user = process.argv[2]

    // Create the browser window.
    const mw = new BrowserWindow({
        width: 800,
        height: 600,
        show: false,
        autoHideMenuBar: false,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
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
        mw.loadFile(join(__dirname, '../renderer/index.html'))
    }

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))
}


ipcMain.on('update-token', (event, token) => {
    updateToken(token)
})
ipcMain.on('download-map', (event, token) => {
    updateToken(token)
})

const menuTemplate = [
    {
        label: '下载',
        click: () => {
            mainWindow.webContents.send('on-download-map')
        }
    },
    {
        label: 'token设置',
        click: () => {
            mainWindow.webContents.send('on-update-token', getCurrentToken())
        }
    },
    {
        label: '空间范围',
        submenu: [
            {
                label: '将当前范围设置为下载范围',
                click: () => {
                    mainWindow.webContents.send('request-extent')
                }
            },
            {
                label: '从shp读取范围'
            },
            {
                label: '手动输入范围'
            }
        ]
    }
]

export { createWindow, mainWindow }
