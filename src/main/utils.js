import { exec } from 'child_process'
import { app, dialog } from 'electron'
import fs from 'fs'
import { join, resolve } from 'path'
import { reactive, toRaw, watch } from 'vue'

import store from './store'

const configPath = join(app.getPath('userData'), 'config.json')
const configData = reactive({
  dwld_token: {
    地质云: 'token1',
    天地图: 'token2',
    谷歌地图: 'token3'
  },
  last_extent: null,
  zoom: null
})

const writeConfig = (configData) => {
  fs.writeFileSync(configPath, JSON.stringify(configData))
}

const loadConfig = (configData) => {
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath))
    if (config) Object.assign(configData, config)
  }
}

loadConfig(configData)

watch(configData, async (newConfig, oldConfig) => {
  writeConfig(newConfig)
})

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

const isZoomLevelValid = (zoom) => {
  return !(isNaN(zoom) || zoom < 6 || zoom > 18)
}

const isTokenValid = (token) => {
  if (token.length != 32) return false
  return true
}

const getSaveFilePath = () => {
  return dialog.showSaveDialogSync({
    title: '保存',
    defaultPath: join(app.getPath('downloads'), 'output.tif'),
    filters: [
      {
        name: 'GeoTIFF',
        extensions: ['tif', 'tiff', 'geotiff']
      }
    ]
  })
}

const downloadMap = (zoom, extent) => {
  zoom = parseInt(r)
  // check zoom
  if (!isZoomLevelValid(zoom)) {
    showNote('error', 'error', '请输入正确的整数')
    return
  }

  const output_path = getSaveFilePath()
  if (!output_path) return

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
const getCurrentToken = () => {
  // return toRaw(configData).dwld_token
  return store.get('map_rules')
}

const updateToken = (token) => {
  // configData.dwld_token = token
  store.set('map_rules', token)
}

export { downloadMap, getCurrentToken, updateToken }
