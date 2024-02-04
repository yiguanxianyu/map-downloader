import { getTopLeft, getWidth } from 'ol/extent'
import TileLayer from 'ol/layer/Tile'
import 'ol/ol.css'
import { get as getProjection } from 'ol/proj'
import WMTS from 'ol/source/WMTS'
import XYZ from 'ol/source/XYZ'
import WMTSTileGrid from 'ol/tilegrid/WMTS'

const tiandituLayer = new TileLayer({
  title: '天地图卫星影像',
  source: new XYZ({
    url:
      'https://t4.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=' +
      import.meta.env.RENDERER_VITE_API_KEY,
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

export { generateLayer, tiandituLayer }
