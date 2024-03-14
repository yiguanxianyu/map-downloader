// import axios from 'axios'
// import { ipcMain } from 'electron'
// import WMTSCapabilities from 'ol/format/WMTSCapabilities.js'

// const getCapabilitiesResult = async (url, token) => {
//   console.log(url, token)
//   // try {
//   //   const response = await axios.get(url, {
//   //     params: {
//   //       tk: token
//   //     }
//   //   })
//   //   // 处理成功情况
//   //   return response.data
//   // } catch (err) {
//   //   console.log(err)
//   //   return -1
//   // }
//   return axios.get(url, {
//     params: {
//       tk: token
//     }
//   })
// }

// ipcMain.handle('get-caps-result', (event, item) => {
//   const result = getCapabilitiesResult(item.url, item.token_server)
//   return result
// })

// const getWMTSOptions = (mapConfig) => {
//   const result = getCapabilitiesResult(mapConfig.url + mapConfig.token_server)
// }

// const getDizhiyunWMTSOptions = (mapConfig) => {
//   const response_data = getCapabilitiesResult(mapConfig.url + mapConfig.token_server)
//   return options
// }

// class mapProviderConfig {
//   constructor(config) {
//     this.url = config.url
//     this.token_browser = config.token_browser
//     this.token_server = config.token_server
//     this.projection = config.projection
//     this.label = config.label
//     this.id = config.id
//     this.min_zoom = config.min_zoom
//     this.max_zoom = config.max_zoom
//     this.provider = config.provider
//   }
//   setConfig(config) {
//     Object.assign(this, config)
//   }
//   getConfig() {
//     return Object.assign({}, aa)
//   }
// }

// class wmtsProvider extends mapProviderConfig {
//   constructor(config) {
//     super(config)
//     this.getcaps_url = config.getcaps_url
//   }

//   setConfig(config) {
//     super.setConfig(config)
//     this.getCapabilities()
//   }

//   getCapabilities() {
//     throw new Error('Not Implemented')
//   }

//   getWMTSConfig() { }
// }

// class geocloudProvider extends mapProviderConfig {
//   constructor(config) {
//     super(config)
//   }

//   async getCapabilities() {
//     try {
//       const response = await axios.get(this.url, {
//         params: {
//           tk: this.token_server
//         }
//       })
//       // 处理成功情况
//       const response_data = response.data

//       const parser = new WMTSCapabilities()
//       const result = parser.read(response_data)

//       const options = optionsFromCapabilities(result, {
//         layer: this.layer,
//         matrixSet: this.matrixSet
//       })

//       options.urls[0] += 'tk=' + this.token_browser

//       options.tileGrid = new WMTSTileGrid({
//         origins: options.tileGrid.origins_, //原点(左上角)
//         resolutions: options.tileGrid.getResolutions(), //分辨率数组
//         matrixIds: options.tileGrid.getMatrixIds() //矩阵标识列表，与地图级数保持一致
//       })

//       return options
//     } catch {
//       console.log('failed')
//     }
//   }
// }

// class xyzProvider extends mapProviderConfig {
//   constructor(config) {
//     super(config)
//   }
// }

// class tiandituProvider extends xyzProvider {
//   constructor(config) {
//     super(config)
//   }
//   getUrl() {
//     return this.url.replace('{token}', this.token_browser)
//   }
// }

// export { getWMTSOptions, getCapabilitiesResult }
