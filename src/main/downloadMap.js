import { app, dialog } from 'electron'
import fs from 'fs'
import { appendFile } from 'fs/promises'
import os from 'os'
import path from 'path'

import logger from './log_custom.js'
import getDatasetHandler from './mapDownloader.js'

const finishedFilePath = path.resolve(path.dirname(app.getPath('exe')), 'done.info')

let deafultDir = app.getPath('downloads')

const removeFinished = () => {
  if (fs.existsSync(finishedFilePath)) {
    fs.unlinkSync(finishedFilePath)
  }
}

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
    title: '保存：' + name + String.raw`（文件名中不能包含<>:"/\|?*）`,
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
  removeFinished()

  const tasks = []

  configs.forEach((config) => {
    const originalFilePath = getSaveFilePath(config.name) // 改为config.name使用图层标签命名，当前使用图层名
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
        logger.info(`Start download: ${newFileName}`)

        const result = handler.download(newFilePath)
        result.then(() => {
          appendFile(finishedFilePath, newFilePath + os.EOL)
          logger.info(`Download finished: ${newFileName}`)
        })

        tasks.push(result)
      } else {
        showNote('info', 'Error', validStatus.reason)
      }
    }
  })

  if (tasks.length === 0) {
    showNote('info', 'Error', '用户取消')
    return
  } else {
    Promise.all(tasks).then(() => {
      showNote('info', '完成', '下载完成')
    })
  }
}

export { downloadMap }
