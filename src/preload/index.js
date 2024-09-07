import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}

contextBridge.exposeInMainWorld('electronAPI', {
  onDownloadMap: (callback) => ipcRenderer.on('on-download-map', () => callback()),
  onReadShp: (callback) => ipcRenderer.on('set-extent-from-shp', (_event, geojson) => callback(geojson)),
  getUrl: (url) => ipcRenderer.invoke('get-url', url),
  downloadMap: (configs) => ipcRenderer.send('download-map', configs),
  log: (type, msg) => ipcRenderer.send('log', { type, msg }),
  store: {
    set: (key, value) => {
      ipcRenderer.send('setStore', key, value)
    },
    get: (key) => {
      return ipcRenderer.invoke('getStore', key)
    }
  },
  extent: {
    setCurrentViewAsExtent: (callback) => ipcRenderer.on('set-extent-current-view', (_event) => callback())
  }
})
