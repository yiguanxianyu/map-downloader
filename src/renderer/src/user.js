import { defineStore } from 'pinia'
import View from 'ol/View'
import LayerGroup from 'ol/layer/Group'
import Map from 'ol/Map'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import Zoom from 'ol/control/Zoom'
import Attribution from 'ol/control/Attribution'

const tileLayerGroup = new LayerGroup({
  layers: [
    new TileLayer({
      title: '天地图卫星影像',
      source: new XYZ({
        url:
          'https://t4.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=' +
          import.meta.env.RENDERER_VITE_API_KEY,
        attributions: ['Map data &copy; <a href="https://www.tianditu.gov.cn/">天地图</a>']
      })
    }),
    new TileLayer({
      title: '标注图层',
      source: new XYZ({
        url:
          'https://t4.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=' +
          import.meta.env.RENDERER_VITE_API_KEY
      })
    })
  ]
})

// 第一个参数是应用程序中 store 的唯一 id
export const useUsersStore = defineStore('users', {
  // 其它配置项
  state: () => {
    return {
      map: new Map({
        target: 'map',
        layers: [tileLayerGroup],
        view: new View({
          center: [12946790, 4864489],
          zoom: 6,
          maxZoom: 18
        }),
        controls: [new Zoom(), new Attribution()]
      })
    }
  }
})
