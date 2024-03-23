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
  downloadMap: (configs) => ipcRenderer.send('download-map', configs),
  onDownloadMap: (callback) => ipcRenderer.on('on-download-map', (_event, value) => callback(value)),
  getUrl: (url) => ipcRenderer.invoke('get-url', url),
  getCapabilitiesResult: (item) => ipcRenderer.invoke('get-caps-result', item),
  store: {
    set: (key, value) => {
      ipcRenderer.send('setStore', key, value)
    },
    get: (key) => {
      const resp = ipcRenderer.sendSync('getStore', key)
      return resp
    }
  },
  extent: {
    setCurrentViewAsExtent: (callback) => ipcRenderer.on('set-extent-current-view', (_event) => callback())
  }
})
