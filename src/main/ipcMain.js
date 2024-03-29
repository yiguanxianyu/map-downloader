import axios from 'axios'
import axiosRetry from 'axios-retry'
import { ipcMain } from 'electron'

import { downloadMap } from './downloadMap.js'
import store from './store.js'

axiosRetry(axios, { retries: 8, retryDelay: axiosRetry.exponentialDelay })

ipcMain.handle('get-url', async (event, url) => {
  try {
    const response = await axios.get(url)
    // 处理成功情况
    return response.data
  } catch {
    console.log('failed')
  }
})

ipcMain.on('download-map', (event, configs) => {
  downloadMap(configs)
})

// 定义ipc监听事件
ipcMain.on('setStore', (_, key, value) => {
  store.set(key, value)
})

ipcMain.on('getStore', (_, key) => {
  let value = store.get(key)
  _.returnValue = value || ''
})
