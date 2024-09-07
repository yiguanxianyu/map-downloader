import { ipcMain } from 'electron'
import log from 'electron-log/main.js'

import store from './store'

log.transports.file.resolvePathFn = () => store.get('LOG_FILE_PATH')
//2024/01/23 09:23:34 - 下载文件***
log.transports.file.format = '{y}/{m}/{d} {h}:{i}:{s} - [{level}]{text}'

ipcMain.on('log', (event, data) => {
  switch (data.type) {
    case 'error':
      log.error(data.msg)
      break
    case 'warn':
      log.warn(data.msg)
      break
    case 'info':
      log.info(data.msg)
      break
    case 'debug':
      log.debug(data.msg)
      break
    default:
      break
  }
})

export default log
