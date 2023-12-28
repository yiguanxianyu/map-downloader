import prompt from 'electron-prompt'
import { exec } from 'child_process'
import { reactive, watch } from 'vue'
import { app, dialog } from 'electron'
import { join, resolve } from 'path'
import fs from 'fs'

const configPath = join(app.getPath('userData'), 'config.json')
const configData = reactive({
  dwld_token: null
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
  const prompt_config = {
    title: '缩放等级',
    label: '请输入缩放等级',
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

const setDwldToken = () => {
  prompt({
    title: '新的下载API Token',
    label: '新的下载API Token',
    type: 'input',
    value: configData.dwld_token,
    inputAttrs: { type: 'text', required: true },
    height: 200
  }).then((r) => {
    if (r === null) {
      console.log('user cancelled')
    } else {
      configData.dwld_token = r
    }
  })
}

export { downloadMap, setDwldToken }
