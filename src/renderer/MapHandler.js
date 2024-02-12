import Collection from 'ol/Collection.js'
import Map from 'ol/Map'
import View from 'ol/View'
import Attribution from 'ol/control/Attribution'
import Zoom from 'ol/control/Zoom'
import { shiftKeyOnly } from 'ol/events/condition.js'
import WMTSCapabilities from 'ol/format/WMTSCapabilities.js'
import Extent from 'ol/interaction/Extent'
import LayerGroup from 'ol/layer/Group'
import TileLayer from 'ol/layer/Tile'
import 'ol/ol.css'
import { transformExtent } from 'ol/proj'
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS'
import XYZ from 'ol/source/XYZ'
import { Fill, Stroke, Style } from 'ol/style.js'
import WMTSTileGrid from 'ol/tilegrid/WMTS'

const tiandituLayer = new TileLayer({
  title: '天地图卫星影像',
  source: new XYZ({
    url: 'https://t4.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=' + import.meta.env.RENDERER_VITE_API_KEY,
    attributions: ['Map data &copy; <a href="https://www.tianditu.gov.cn/">天地图</a>']
  })
})

//根据给定的配置生成一个WMTS图层
const generateWMTSLayer = async (mapConfig, callback) => {
  const response_data = await window.electronAPI.getCapabilities(mapConfig.url + mapConfig.token_server)

  const parser = new WMTSCapabilities()
  const result = parser.read(response_data)

  const options = optionsFromCapabilities(result, {
    layer: mapConfig.layer,
    matrixSet: mapConfig.matrixSet
  })
  console.log(options)
  options.urls[0] += 'tk=' + mapConfig.token_browser

  options.tileGrid = new WMTSTileGrid({
    origins: options.tileGrid.origins_, //原点(左上角)
    resolutions: options.tileGrid.getResolutions(), //分辨率数组
    matrixIds: options.tileGrid.getMatrixIds() //矩阵标识列表，与地图级数保持一致
  })

  const newLayer2add = new TileLayer({
    source: new WMTS(options)
  })

  callback(newLayer2add)
}

// 根据给定的配置生成一个XYZ图层
const generateXYZLayer = (mapConfig) => {
  return new TileLayer({
    title: mapConfig.label,
    source: new XYZ({
      url: mapConfig.url + mapConfig.token_browser
    })
  })
}

class MyMap {
  constructor() {
    this.customLayer = new Collection([]) // 当前显示的图层

    this.view = new View({
      center: [12000000, 5000000],
      zoom: 3,
      maxZoom: 18,
      extent: transformExtent([60, 0, 150, 60], 'EPSG:4326', 'EPSG:3857')
    })

    this.map = new Map({
      layers: [tiandituLayer, new LayerGroup({ layers: this.customLayer })],
      view: this.view,
      controls: [new Zoom(), new Attribution()]
    })

    this.draw = new Extent({
      condition: shiftKeyOnly,
      boxStyle: new Style({
        fill: new Fill({
          color: [255, 255, 255, 0.3]
        }),
        stroke: new Stroke({
          color: [0, 153, 255, 1],
          width: 2
        })
      })
    })
    this.map.addInteraction(this.draw)
  }
  get currentZoom() {
    return Math.round(this.view.values_.zoom)
  }
  get hasSelectedExtent() {
    return this.draw.getExtent() !== null
  }
  get currentViewExtent() {
    return this.view.calculateExtent(this.map.getSize())
  }
  get currentSelectedExtent() {
    return this.draw.getExtent()
  }

  setTarget = (target) => this.map.setTarget(target)

  changeLayer = (newOLLayer) => {
    this.customLayer.clear()
    this.customLayer.push(newOLLayer)
  }

  changeCurrentLayer = (mapConfig) => {
    //根据给定的配置，判断生成什么图层
    if (mapConfig.type === 'WMTS') {
      generateWMTSLayer(mapConfig, this.changeLayer)
    } else if (mapConfig.type === 'XYZ') {
      generateXYZLayer(mapConfig, this.changeLayer)
    }
  }

  setCurrentViewAsExtent = () => {
    this.draw.setExtent(this.currentViewExtent)
  }
}

export default MyMap
