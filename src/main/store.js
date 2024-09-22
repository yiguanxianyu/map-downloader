import { app, ipcMain } from 'electron'
import Store from 'electron-store'
import path from 'path'

const config = {
  map_rules: [
    {
      url: 'https://igss.cgs.gov.cn:6160/igs/rest/ogc/qg20_20210401_FCnDDRJd/WMTSServer',
      provider: 'GeoCloud',
      id: '1',
      label: '全国1:20万地质图-地质云',
      type: 'WMTS',
      token_browser:
        'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYmE2Zjc4ZC1hNTExLTRmOTYtYTY3Yi1lMzA3MDZmNDY0ZDgifQ.pECeSVzA9d0NGLs_twUO8Z7zeVMr3srXPkmJHxn9o5Y',
      token_server:
        'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0NDdjNTViOS05OTJjLTRlOWUtYmU2OC1iZjdlNDlhYzNlNWQifQ.10VfI2wCxmMa9dCZ51Y_KXexkSXGvfEp4KROFb1odxg',
      min_zoom: 1,
      max_zoom: 15,
      projection: 'EPSG:4326',
      layer: 'qg20_20210401_FCnDDRJd',
      matrixSet: 'EPSG:4326_qg20_20210401_FCnDDRJd_028mm_GB'
    },
    {
      url: 'https://igss.cgs.gov.cn:6160/igs/rest/ogc/qg50w_20210416_F7qGy9A7/WMTSServer',
      provider: 'GeoCloud',
      id: '2',
      label: '全国1:50万地质图-地质云',
      type: 'WMTS',
      token_browser:
        'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYmE2Zjc4ZC1hNTExLTRmOTYtYTY3Yi1lMzA3MDZmNDY0ZDgifQ.pECeSVzA9d0NGLs_twUO8Z7zeVMr3srXPkmJHxn9o5Y',
      token_server:
        'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0NDdjNTViOS05OTJjLTRlOWUtYmU2OC1iZjdlNDlhYzNlNWQifQ.10VfI2wCxmMa9dCZ51Y_KXexkSXGvfEp4KROFb1odxg',
      min_zoom: 1,
      max_zoom: 14,
      projection: 'EPSG:4326',
      layer: 'qg50w_20210416_F7qGy9A7',
      matrixSet: 'EPSG:4326_qg50w_20210416_F7qGy9A7_028mm_GB'
    },
    {
      url: 'https://igss.cgs.gov.cn:6160/igs/rest/ogc/全国100万地质图_20210330_rpam5kdJ/WMTSServer',
      provider: 'GeoCloud',
      id: '3',
      label: '全国1:100万地质图-地质云',
      type: 'WMTS',
      token_browser:
        'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYmE2Zjc4ZC1hNTExLTRmOTYtYTY3Yi1lMzA3MDZmNDY0ZDgifQ.pECeSVzA9d0NGLs_twUO8Z7zeVMr3srXPkmJHxn9o5Y',
      token_server:
        'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0NDdjNTViOS05OTJjLTRlOWUtYmU2OC1iZjdlNDlhYzNlNWQifQ.10VfI2wCxmMa9dCZ51Y_KXexkSXGvfEp4KROFb1odxg',
      min_zoom: 0,
      max_zoom: 11,
      projection: 'EPSG:4326',
      layer: '全国100万地质图_20210330_rpam5kdJ',
      matrixSet: 'EPSG:4326_全国100万地质图_20210330_rpam5kdJ_028mm_GB'
    },
    {
      url: 'https://igss.cgs.gov.cn:6160/igs/rest/ogc/qg150w_20210416_BIwqE0wU/WMTSServer',
      provider: 'GeoCloud',
      id: '4',
      label: '全国1:150万地质图-地质云',
      type: 'WMTS',
      token_browser:
        'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYmE2Zjc4ZC1hNTExLTRmOTYtYTY3Yi1lMzA3MDZmNDY0ZDgifQ.pECeSVzA9d0NGLs_twUO8Z7zeVMr3srXPkmJHxn9o5Y',
      token_server:
        'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0NDdjNTViOS05OTJjLTRlOWUtYmU2OC1iZjdlNDlhYzNlNWQifQ.10VfI2wCxmMa9dCZ51Y_KXexkSXGvfEp4KROFb1odxg',
      min_zoom: 0,
      max_zoom: 14,
      projection: 'EPSG:4326',
      layer: 'qg150w_20210416_BIwqE0wU',
      matrixSet: 'EPSG:4326_qg150w_20210416_BIwqE0wU_028mm_GB'
    },
    {
      url: 'https://igss.cgs.gov.cn:6160/igs/rest/ogc/qg250w_20210416_ZAZSeOGX/WMTSServer',
      provider: 'GeoCloud',
      id: '5',
      label: '全国1:250万地质图-地质云',
      type: 'WMTS',
      token_browser:
        'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJjYmE2Zjc4ZC1hNTExLTRmOTYtYTY3Yi1lMzA3MDZmNDY0ZDgifQ.pECeSVzA9d0NGLs_twUO8Z7zeVMr3srXPkmJHxn9o5Y',
      token_server:
        'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0NDdjNTViOS05OTJjLTRlOWUtYmU2OC1iZjdlNDlhYzNlNWQifQ.10VfI2wCxmMa9dCZ51Y_KXexkSXGvfEp4KROFb1odxg',
      min_zoom: 0,
      max_zoom: 14,
      projection: 'EPSG:4326',
      layer: 'qg250w_20210416_ZAZSeOGX',
      matrixSet: 'EPSG:4326_qg250w_20210416_ZAZSeOGX_028mm_GB'
    },
    {
      url: '',
      provider: '',
      id: '6',
      label: '',
      type: 'WMTS',
      token_browser: '',
      token_server: '',
      min_zoom: 0,
      max_zoom: 14,
      projection: '',
      layer: '',
      matrixSet: ''
    },
    {
      url: '',
      provider: '',
      id: '7',
      label: '',
      type: 'WMTS',
      token_browser: '',
      token_server: '',
      min_zoom: 0,
      max_zoom: 14,
      projection: '',
      layer: '',
      matrixSet: ''
    },
    {
      url: '',
      provider: '',
      id: '8',
      label: '',
      type: 'WMTS',
      token_browser: '',
      token_server: '',
      min_zoom: 0,
      max_zoom: 14,
      projection: '',
      layer: '',
      matrixSet: ''
    },
    {
      url: '',
      provider: '',
      id: '9',
      label: '',
      type: 'WMTS',
      token_browser: '',
      token_server: '',
      min_zoom: 0,
      max_zoom: 14,
      projection: '',
      layer: '',
      matrixSet: ''
    },
    {
      url: '',
      provider: '',
      id: '10',
      label: '',
      type: 'WMTS',
      token_browser: '',
      token_server: '',
      min_zoom: 0,
      max_zoom: 14,
      projection: '',
      layer: '',
      matrixSet: ''
    }
    // {
    //   url: 'http://t0.tianditu.gov.cn/img_w/wmts?request=GetCapabilities&service=wmts',
    //   provider: '天地图',
    //   id: '0',
    //   label: '天地图-矢量底图',
    //   type: 'WMTS',
    //   token_browser: 'd9262a81b7661921ef0606542b8d6653',
    //   token_server: '',
    //   min_zoom: 1,
    //   max_zoom: 18,
    //   projection: 'EPSG:3857',
    //   layer: 'img',
    //   matrixSet: 'w'
    // },
    // {
    //   url: 'http://example.com',
    //   provider: 'Google',
    //   id: '1',
    //   label: '谷歌',
    //   type: 'XYZ',
    //   token_browser: 'token1',
    //   token_server:
    //     'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0NDdjNTViOS05OTJjLTRlOWUtYmU2OC1iZjdlNDlhYzNlNWQifQ.10VfI2wCxmMa9dCZ51Y_KXexkSXGvfEp4KROFb1odxg',
    //   min_zoom: 0,
    //   max_zoom: 14,
    //   projection: 'EPSG:3857'
    // },
  ]
}

const schema = {
  map_rules: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        url: {
          type: 'string'
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
          type: 'integer',
          minimum: 0
        },
        max_zoom: {
          type: 'integer'
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

const initialize = (currStore) => {
  currStore.set('map_rules', config.map_rules)
  currStore.set('NOT_FIRST_RUN_FLAG', true)
  currStore.set('LOG_FILE_PATH', path.resolve(path.dirname(app.getPath('exe')), 'log.txt'))
}

const store = new Store({ schema })

if (!store.has('NOT_FIRST_RUN_FLAG')) {
  // 第一次打开软件时，初始化数据
  initialize(store)
}
// 测试用
// store.set('map_rules', config.map_rules)

// 定义ipc监听事件
ipcMain.on('setStore', (_, key, value) => {
  store.set(key, value)
})

ipcMain.handle('getStore', (_, key) => {
  return store.get(key) || ''
})

export default store
