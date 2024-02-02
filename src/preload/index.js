import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

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
  sendDwldArgs: (zoom, extent) => ipcRenderer.send('download-map', zoom, extent),
  updateToken: (token) => ipcRenderer.send('update-token', token),
  onUpdateToken: (callback) => ipcRenderer.on('on-update-token', (_event, value) => callback(value)),
  downloadMapx: (extent, zoom) => ipcRenderer.send('download-map', extent, zoom),
  onDownloadMap: (callback) => ipcRenderer.on('on-download-map', (_event, value) => callback(value)),
})
