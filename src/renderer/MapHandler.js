import Collection from 'ol/Collection.js'
import Map from 'ol/Map'
import View from 'ol/View'
import Attribution from 'ol/control/Attribution'
import Zoom from 'ol/control/Zoom'
import { shiftKeyOnly } from 'ol/events/condition.js'
import { getTopLeft, getWidth } from 'ol/extent'
import Extent from 'ol/interaction/Extent'
import LayerGroup from 'ol/layer/Group'
import TileLayer from 'ol/layer/Tile'
import 'ol/ol.css'
import { get as getProjection, transformExtent } from 'ol/proj'
import WMTS from 'ol/source/WMTS'
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
const generateWMTSLayer = (mapConfig) => {
  const projection = getProjection(mapConfig.projection)
  const projectionExtent = projection.getExtent()
  const size = getWidth(projectionExtent) / 256

  // 计算分辨率和矩阵ID
  const resolutions = []
  const matrixIds = []
  for (let i = mapConfig.min_zoom; i <= mapConfig.max_zoom; i++) {
    resolutions.push(size / Math.pow(2, i + 1))
    matrixIds.push(i)
  }

  return new TileLayer({
    title: mapConfig.label,
    source: new WMTS({
      url: mapConfig.url + mapConfig.token_browser,
      layer: mapConfig.layer,
      matrixSet: mapConfig.matrixSet,
      projection: projection,
      format: 'image/png',
      tileGrid: new WMTSTileGrid({
        origin: getTopLeft(projectionExtent), //原点(左上角)
        resolutions: resolutions, //分辨率数组
        matrixIds: matrixIds //矩阵标识列表，与地图级数保持一致
      })
    })
  })
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
//根据给定的配置，判断生成什么图层
const generateLayer = (mapConfig) => {
  if (mapConfig.type === 'WMTS') {
    return generateWMTSLayer(mapConfig)
  } else if (mapConfig.type === 'XYZ') {
    return generateXYZLayer(mapConfig)
  }
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

  changeCurrentLayer = (newLayer) => {
    this.customLayer.clear()
    this.customLayer.push(generateLayer(newLayer))
  }
  setCurrentViewAsExtent = () => {
    this.draw.setExtent(this.currentViewExtent)
  }
}

export default MyMap
