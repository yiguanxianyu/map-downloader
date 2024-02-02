import prompt from 'electron-prompt'
import { exec } from 'child_process'
import { reactive, watch, toRaw } from 'vue'
import { app, dialog } from 'electron'
import { join, resolve } from 'path'
import fs from 'fs'

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
  // check token
  if (!isTokenValid(configData.dwld_token)) {
    showNote('error', 'error', 'token格式错误')
    return
  }

  const prompt_config = {
    title: '缩放等级',
    label: '请输入缩放等级(6到19之间的整数)',
    type: 'input',
    value: zoom,
    inputAttrs: { type: 'text', required: true },
    height: 200
  }

  prompt(prompt_config)
    .then((r) => {
      if (r === null) {
        console.log('user cancelled')
      } else {
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
    })
    .catch(console.error)
}
const getCurrentToken = () => {
  return toRaw(configData).dwld_token
}

const updateToken = (token) => {
  configData.dwld_token = token
}

export { downloadMap, getCurrentToken, updateToken }
