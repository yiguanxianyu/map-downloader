import { exec } from 'child_process'
import { app, dialog } from 'electron'
import { join, resolve } from 'path'

import mapDownloader from './canvas-download.js'

// import { getCapabilitiesResult } from './mapSourceConfigHandler.js'

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

const getSaveFilePath = () => {
  return dialog.showOpenDialogSync({
    title: '保存',
    defaultPath: app.getPath('downloads'),
    properties: ['openDirectory']
  })
}

const downloadMap = (configs, extent) => {
  // console.log(configs, extent)
  const output_path = getSaveFilePath()
  if (output_path === undefined) return
  configs.forEach((config) => {
    downloadSingleMap(config, extent, output_path[0])
  })
}

const downloadSingleMap = (config, extent, output_folder) => {
  const zoom = config.zoom
  const outputFileName = `${config.row.label}_level${zoom}.tif`
  const outputFilePath = join(output_folder, outputFileName)

  const capabilitiesResult = getCapabilitiesResult(config.row.url + config.row.token_server)
  console.log(capabilitiesResult)

  const type = config.type

  return

  const full_command = [
    resolve(import.meta.env.MAIN_VITE_PYTHON_ACTIVATE_PATH),
    resolve(import.meta.env.MAIN_VITE_PYTHON_SCRIPT_PATH),
    output_path,
    zoom,
    configData.dwld_token,
    extent[0],
    extent[1],
    extent[2],
    extent[3]
  ].join(' ')

  exec(full_command, (error, stdout, stderr) => {
    if (error) showNote('error', 'error', error)
    else if (stderr) showNote('error', 'stderr', stderr)
    else showNote('info', 'stdout', stdout)
  })
}

export { downloadMap }
