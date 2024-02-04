import { ipcMain } from 'electron'
import Store from 'electron-store'

const config = {
  map_rules: [
    {
      url: 'http://example.com',
      provider: 'Google',
      id: '1',
      label: '谷歌',
      type: 'XYZ',
      token_browser: 'token1',
      token_server: 'token2',
      min_zoom: 0,
      max_zoom: 14,
      projection: 'EPSG:4326'
    },
    {
      url: 'https://igss.cgs.gov.cn:6160/igs/rest/ogc/qg20_20210401_FCnDDRJd/WMTSServer?tk=',
      provider: 'GeoCloud',
      id: '2',
      label: '全国1:20万地质图-地质云',
      type: 'WMTS',
      token_browser:
        'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYmE2Zjc4ZC1hNTExLTRmOTYtYTY3Yi1lMzA3MDZmNDY0ZDgifQ.pECeSVzA9d0NGLs_twUO8Z7zeVMr3srXPkmJHxn9o5Y',
      token_server: 'token2',
      min_zoom: 0,
      max_zoom: 14,
      projection: 'EPSG:4326',
      layer: 'qg20_20210401_FCnDDRJd',
      matrixSet: 'EPSG:4326_qg20_20210401_FCnDDRJd_028mm_GB'
    },
    {
      url: 'https://igss.cgs.gov.cn:6160/igs/rest/ogc/qg50w_20210416_F7qGy9A7/WMTSServer?tk=',
      provider: 'GeoCloud',
      id: '3',
      label: '全国1:50万地质图-地质云',
      type: 'WMTS',
      token_browser:
        'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYmE2Zjc4ZC1hNTExLTRmOTYtYTY3Yi1lMzA3MDZmNDY0ZDgifQ.pECeSVzA9d0NGLs_twUO8Z7zeVMr3srXPkmJHxn9o5Y',
      token_server: 'token2',
      min_zoom: 0,
      max_zoom: 13,
      projection: 'EPSG:4326',
      layer: 'qg50w_20210416_F7qGy9A7',
      matrixSet: 'EPSG:4326_qg50w_20210416_F7qGy9A7_028mm_GB'
    }
  ]
}

const schema = {
  map_rules: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          format: 'uri'
        },
        provider: {
          type: 'string'
        },
        id: {
          type: 'string'
        },
        label: {
          type: 'string'
        },
        type: {
          type: 'string'
        },
        token_browser: {
          type: 'string'
        },
        token_server: {
          type: 'string'
        },
        min_zoom: {
          type: 'number',
          minimum: 0
        },
        max_zoom: {
          type: 'number',
          maximum: 18
        },
        projection: {
          type: 'string'
        },
        layer: {
          type: 'string'
        },
        matrixSet: {
          type: 'string'
        }
      },
      required: ['url', 'provider', 'id', 'label', 'type']
    }
  }
}

const store = new Store({ schema })
// console.log('size', electronStore.size) // 获取项目总个数
// console.log('path', electronStore.path) // 获取存储文件的路径
// console.log('store', electronStore.store) // 获取所有数据作为对象或将当前数据替换为对象
// console.log('set', electronStore.set()) // 存储数据
// console.log('get', electronStore.get()) // 获取数据
// console.log('delete', electronStore.delete()) // 删除某项数据
// console.log('clear', electronStore.clear()) // 清除所有store数据
// console.log('has', electronStore.has()) // 检测是否存在某条数据

// if (!store.get('first')) {
//   // 第一次打开软件时，初始化数据
//   store.set('map_rules', config.map_rules)
//   store.set('first', true)
// }
store.set('map_rules', config.map_rules)

// 定义ipc监听事件
ipcMain.on('setStore', (_, key, value) => {
  store.set(key, value)
})

ipcMain.on('getStore', (_, key) => {
  let value = store.get(key)
  _.returnValue = value || ''
})

export default store