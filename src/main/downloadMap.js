import { execFile } from 'child_process'
import { app, dialog } from 'electron'
import os from 'os'
import path, { join } from 'path'

import getDatasetHandler from './mapDownloader.js'
import PathManager from './pathManager.js'

const pathManager = new PathManager(os.homedir() + '/inputs.txt', os.homedir() + '/outputs.txt')

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

const getSaveFilePath = (name) => {
  const outputPath = dialog.showSaveDialogSync({
    title: '保存：' + name,
    defaultPath: join(deafultDir, name + '.tif'),
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

const addOverview = (filePath) => {
  if (process.platform === 'win32') {
    execFile(
      'MHGDALAddo.exe',
      [filePath],
      {
        cwd: join(process.cwd(), '/resources/gdaladdo')
      },
      (error, stdout, stderr) => {
        if (error) throw new Error(error)
      }
    )
  }
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
        pathManager.add(newFilePath)
        handler.download(newFilePath).then(() => {
          pathManager.remove(newFilePath)
          // addOverview(newFilePath)
        })
      } else {
        showNote('info', 'Error', validStatus.reason)
      }
    }
  })
}

// const downloadSingleMap = async (type, url, zoom, extent, newFilePath) => {
//   console.log(config, extent, output_folder)
//   const zoom = config.zoom
//   const outputFileName = `${config.row.label}_level${zoom}.tif`
//   const outputFilePath = join(output_folder, outputFileName)

//   const capabilitiesResult = getCapabilitiesResult(config.row.url + config.row.token_server)
//   console.log(capabilitiesResult)

//   const type = config.type

//   const full_command = [
//     resolve(import.meta.env.MAIN_VITE_PYTHON_ACTIVATE_PATH),
//     resolve(import.meta.env.MAIN_VITE_PYTHON_SCRIPT_PATH),
//     output_path,
//     zoom,
//     configData.dwld_token,
//     extent[0],
//     extent[1],
//     extent[2],
//     extent[3]
//   ].join(' ')

//   exec(full_command, (error, stdout, stderr) => {
//     if (error) showNote('error', 'error', error)
//     else if (stderr) showNote('error', 'stderr', stderr)
//     else showNote('info', 'stdout', stdout)
//   })
// }

export { downloadMap }
