import Collection from 'ol/Collection.js'
import Map from 'ol/Map'
import View from 'ol/View'
import Attribution from 'ol/control/Attribution'
import Zoom from 'ol/control/Zoom'
import { shiftKeyOnly } from 'ol/events/condition.js'
import Extent from 'ol/interaction/Extent'
import LayerGroup from 'ol/layer/Group'
import TileLayer from 'ol/layer/Tile'
import 'ol/ol.css'
import { transformExtent } from 'ol/proj'
import XYZ from 'ol/source/XYZ'
import { Fill, Stroke, Style } from 'ol/style.js'

import { getMapProvier } from './mapSourceConfigHandler'

const tiandituLayer = new TileLayer({
  title: '天地图卫星影像',
  source: new XYZ({
    url:
      'https://t{0-7}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=' + import.meta.env.RENDERER_VITE_API_KEY,
    attributions: ['Map data &copy; <a href="https://www.tianditu.gov.cn/">天地图</a>']
  })
})

class MapHandler {
  constructor() {
    this.customLayer = new Collection([]) // 当前显示的图层

    this.view = new View({
      center: [12000000, 4000000],
      zoom: 5,
      maxZoom: 18,
      extent: transformExtent([60, 0, 150, 60], 'EPSG:4326', 'EPSG:3857')
    })

    this.map = new Map({
      layers: [tiandituLayer, new LayerGroup({ layers: this.customLayer })],
      view: this.view,
      controls: [new Zoom(), new Attribution()]
    })

    // 在地图上绘制范围
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

    this.providers = new Object()
  }
  get currentZoom() {
    return Math.round(this.view.getZoom())
  }
  get hasSelectedExtent() {
    return this.draw.getExtent() !== null
  }

  getCurrentSelectedExtentForLayer(mapConfig) {
    const extent = this.draw.getExtent()
    return transformExtent(extent, this.map.getView().getProjection(), mapConfig.projection)
  }

  async getWMTSLayerInfo(item) {
    if (!(item.id in this.providers)) {
      this.providers[item.id] = await getMapProvier(item)
    }
    const provider = this.providers[item.id]
    const wmts_layer_info = provider.getWMTSLayerInfo()
    return wmts_layer_info
  }

  async getTileUrlAtZoom(item, zoom) {
    if (!(item.id in this.providers)) {
      this.providers[item.id] = await getMapProvier(item)
    }
    return this.providers[item.id].getTileUrlAtZoom(zoom)
  }

  setTarget(target) {
    this.map.setTarget(target)
  }

  changeLayer(newOLLayer) {
    this.customLayer.clear()
    this.customLayer.push(newOLLayer)
  }

  setCurrentViewAsExtent() {
    const mapSize = this.map.getSize()
    const extent = this.view.calculateExtent(mapSize)
    this.draw.setExtent(extent)
  }

  async readShp(geojson) {
    const extent_3857 = geojson.features[0].geometry.bbox
    const extent = transformExtent(extent_3857, 'EPSG:4326', 'EPSG:3857')
    this.draw.setExtent(extent)
  }

  async changeCurrentLayer(mapConfig) {
    const newProvider = await getMapProvier(mapConfig)
    const newLayer = await newProvider.generateLayer()
    this.changeLayer(newLayer)
    this.currentProvider = newProvider
    this.providers[newProvider.id] = newProvider
  }
}

export { MapHandler }
