import { exec } from 'child_process'
import { app, dialog } from 'electron'
import { join, resolve } from 'path'

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
  const output_path = getSaveFilePath()[0]
  configs.forEach((config) => {
    downloadSingleMap(config, extent, output_path)
  })
}

const downloadSingleMap = (config, extent, output_folder) => {
  const zoom = config.zoom
  const outputFileName = `${config.row.label}_level${zoom}.tif`
  const outputFilePath = join(output_folder, outputFileName)

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
