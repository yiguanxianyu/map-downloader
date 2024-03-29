import { app, dialog } from 'electron'
import { appendFile } from 'fs/promises'
import os from 'os'
import path from 'path'

import getDatasetHandler from './mapDownloader.js'

const finishedFilePath = path.resolve(os.homedir() + '/done.info')

let deafultDir = app.getPath('downloads')

const showNote = (type, title, body) => {
  dialog.showMessageBoxSync(null, {
    type: type,
    buttons: ['Ok'],
    defaultId: 0,
    cancelId: 0,
    message: body.toString(),
    title: title
  })
}

function getCurrentTimestampFormatted() {
  const now = new Date()

  const year = now.getFullYear().toString()
  const month = (now.getMonth() + 1).toString().padStart(2, '0') // 月份是从0开始的，所以要加1
  const day = now.getDate().toString().padStart(2, '0')
  const hour = now.getHours().toString().padStart(2, '0')
  const minute = now.getMinutes().toString().padStart(2, '0')
  const second = now.getSeconds().toString().padStart(2, '0')

  return year + month + day + '_' + hour + minute + second
}

const getSaveFilePath = (name) => {
  const timeStamp = getCurrentTimestampFormatted()
  const outputPath = dialog.showSaveDialogSync({
    title: '保存：' + name,
    defaultPath: path.join(deafultDir, name + '_' + timeStamp + '.tif'),
    filters: [
      {
        name: 'GeoTIFF',
        extensions: ['tif', 'tiff']
      }
    ]
  })
  if (outputPath !== undefined) {
    deafultDir = path.dirname(outputPath)
  }
  return outputPath
}

const downloadMap = (configs) => {
  configs.forEach((config) => {
    const originalFilePath = getSaveFilePath(config.name)
    if (originalFilePath === undefined) return

    const dir = path.dirname(originalFilePath)
    const baseName = path.basename(originalFilePath, path.extname(originalFilePath))
    const extension = path.extname(originalFilePath)

    for (let item of config.urls) {
      const newFileName = `${baseName}_${item.zoom}${extension}`
      const newFilePath = path.join(dir, newFileName)

      const handler = getDatasetHandler(config.type, item.url, item.zoom, config.extent)
      const validStatus = handler.checkValid()

      if (validStatus.isValid) {
        handler.download(newFilePath).then(() => appendFile(finishedFilePath, newFilePath + os.EOL))
      } else {
        showNote('info', 'Error', validStatus.reason)
      }
    }
  })
}

export { downloadMap }
