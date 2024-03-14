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
import { transformExtent, get as getProjection } from 'ol/proj'
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS'
import XYZ from 'ol/source/XYZ'
import { Fill, Stroke, Style } from 'ol/style.js'
import WMTSTileGrid from 'ol/tilegrid/WMTS'

const tiandituLayer = new TileLayer({
  title: '天地图卫星影像',
  source: new XYZ({
    url:
      'https://t{0-7}.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=' + import.meta.env.RENDERER_VITE_API_KEY,
    attributions: ['Map data &copy; <a href="https://www.tianditu.gov.cn/">天地图</a>']
  })
})

const getWMTSCaps = (response_data) => {
  const parser = new WMTSCapabilities()
  const result = parser.read(response_data)
  return result
}

const generateDefaultWMTSOptions = (response_data, mapConfig) => {
  const result = getWMTSCaps(response_data)
  const options = optionsFromCapabilities(result, {
    layer: mapConfig.layer,
    matrixSet: mapConfig.matrixSet
  })
  return options
}

const generateDefaultWMTSOptionsWithToken = (response_data, mapConfig) => {
  const result = getWMTSCaps(response_data)

  const options = optionsFromCapabilities(result, {
    layer: mapConfig.layer,
    matrixSet: mapConfig.matrixSet
  })
  // console.log(result)
  options.urls[0] += 'tk=' + mapConfig.token_browser

  options.tileGrid = new WMTSTileGrid({
    origins: options.tileGrid.origins_, //原点(左上角)
    resolutions: options.tileGrid.getResolutions(), //分辨率数组
    matrixIds: options.tileGrid.getMatrixIds() //矩阵标识列表，与地图级数保持一致
  })
  return options
}

const generateDizhiyunWMTSOptions = (response_data, mapConfig) => {
  const result = getWMTSCaps(response_data)

  const options = optionsFromCapabilities(result, {
    layer: mapConfig.layer,
    matrixSet: mapConfig.matrixSet
  })
  // console.log(result)
  options.urls[0] += 'tk=' + mapConfig.token_browser

  options.tileGrid = new WMTSTileGrid({
    origins: options.tileGrid.origins_, //原点(左上角)
    resolutions: options.tileGrid.getResolutions(), //分辨率数组
    matrixIds: options.tileGrid.getMatrixIds() //矩阵标识列表，与地图级数保持一致
  })
  return options
}

//根据给定的配置生成一个WMTS图层
const generateWMTSLayer = async (mapConfig, callback) => {
  const response_data = await window.electronAPI.getCapabilitiesResult(mapConfig)
  let options

  switch (mapConfig.provider) {
    case 'GeoCloud':
      options = generateDizhiyunWMTSOptions(response_data, mapConfig)
      break
    default:
      options = generateDefaultWMTSOptions(response_data, mapConfig)
  }

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
      zoom: 4,
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

    this.wmts_configs = new Object()
  }
  get currentZoom() {
    return Math.round(this.view.getZoom())
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

  setCurrentViewAsExtent = () => {
    this.draw.setExtent(this.currentViewExtent)
  }

  changeCurrentLayer = (mapConfig) => {
    //根据给定的配置，判断生成什么图层
    if (mapConfig.type === 'WMTS') {
      generateWMTSLayer(mapConfig, this.changeLayer)
    } else if (mapConfig.type === 'XYZ') {
      generateXYZLayer(mapConfig, this.changeLayer)
    }
  }

  generateWMTSLayer = async (mapConfig) => {
    const response_data = await window.electronAPI.getCapabilitiesResult(mapConfig)
    const result = getWMTSCaps(response_data).Contents
    console.log(result)
    const Layers = result.Layer
    const TileMatrixSets = result.TileMatrixSet

    const TileMatrixSetsInfo = new Object()
    for (let i = 0; i < TileMatrixSets.length; i++) {
      const tms = TileMatrixSets[i]
      TileMatrixSetsInfo[tms.Identifier] = tms
    }

    this.wmts_configs.layers = new Object()
    for (let i = 0; i < Layers.length; i++) {
      const layer = Layers[i]
      const layerName = layer.Identifier

      this.wmts_configs.layers[layerName] = new Object()

      const tms_links = Array.from(layer.TileMatrixSetLink, item => item.TileMatrixSet)
      for (let j = 0; j < tms_links.length; j++) {
        const tms = tms_links[j]
        const tmsInfo = TileMatrixSetsInfo[tms]
        this.wmts_configs.layers[layerName][tms] = tmsInfo
      }
    }
    console.log('shit')
  }

  getTileMatrix = (layerName, TileMatrixSet, zoom) => {
    let projection;
    console.log(this.wmts_configs.layers)

    const lr = this.wmts_configs.layers[layerName]
    const tms = lr[TileMatrixSet]
    const code = tms.SupportedCRS;
    if (code) {
      projection = getProjection(code);
    } else {
      projection = getProjection('EPSG:4326');
    }
    const unit = projection.getMetersPerUnit()
    console.log(unit)
    const resolutionAtZoom = this.view.getResolutionForZoom(zoom)
    const targetSD = resolutionAtZoom * unit / 0.00028
    console.log(targetSD)

    const result = tms.TileMatrix.reduce((prev, curr) => {
      const sd_prev = prev.ScaleDenominator
      const sd_curr = curr.ScaleDenominator
      if (Math.abs(curr - target) < Math.abs(prev - target)) {
        return curr;
      } return prev;
    });
    const resolution =
      (matrix.ScaleDenominator * 0.00028) / unit;
  }
}

export { getWMTSCaps, MyMap as MapHandler }
