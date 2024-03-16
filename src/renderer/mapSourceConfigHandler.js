import WMTSCapabilities from 'ol/format/WMTSCapabilities.js'
import TileLayer from 'ol/layer/Tile'
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS'
import WMTSTileGrid from 'ol/tilegrid/WMTS'

class baseProvider {
  /**
   * Base class for map provider.
   *
   * @param {Object} config - The configuration object containing properties to be assigned.
   */
  constructor(config) {
    Object.assign(this, config)

    this.url = config.url
    this.token_browser = config.token_browser
    this.token_server = config.token_server
    this.projection = config.projection
    this.label = config.label
    this.id = config.id
    this.min_zoom = config.min_zoom
    this.max_zoom = config.max_zoom
    this.provider = config.provider
    this.type = config.type
  }
}

class wmtsProvider extends baseProvider {
  constructor(config) {
    super(config)
    this.capabilities = null
    this.options = null
    this.layer = config.layer
    this.matrixSet = config.matrixSet
    this.wmts_layer_info = null
  }
  async initialize() {
    await this.getCapabilities()
    this.getOptions()
    this.getWMTSLayerInfo()
  }
  getWMTSConfig() {
    throw new Error('Not Implemented')
  }
  async getCapabilities() {
    throw new Error('Not Implemented')
  }
  async getOptions() {
    throw new Error('Not Implemented')
  }
  async getTileUrl(tileMatrix) {
    throw new Error('Not Implemented')
  }
  exportWMTSLayerConfig() {
    return {
      url: this.url,
      token_browser: this.token_browser,
      token_server: this.token_server,
      projection: this.projection,
      label: this.label,
      id: this.id,
      min_zoom: this.min_zoom,
      max_zoom: this.max_zoom,
      provider: this.provider,
      layer: this.layer,
      matrixSet: this.matrixSet,
      type: this.type
    }
  }
  generateLayer() {
    this.layer = new TileLayer({
      source: new WMTS(this.options)
    })
    return this.layer
  }
  /**
   * Retrieves the WMTS layer information.
   *
   * @return {Object} The WMTS layer information.
   */
  getWMTSLayerInfo() {
    if (this.wmts_layer_info !== null) {
      return this.wmts_layer_info
    }

    const result = this.capabilities.Contents

    const Layers = result.Layer
    const TileMatrixSets = result.TileMatrixSet

    const TileMatrixSetsInfo = new Object()
    for (let i = 0; i < TileMatrixSets.length; i++) {
      const tms = TileMatrixSets[i]
      TileMatrixSetsInfo[tms.Identifier] = tms
    }

    this.wmts_layer_info = new Object()
    for (let i = 0; i < Layers.length; i++) {
      const layer = Layers[i]
      const layerName = layer.Identifier

      this.wmts_layer_info[layerName] = new Object()

      const tms_links = Array.from(layer.TileMatrixSetLink, (item) => item.TileMatrixSet)
      for (let j = 0; j < tms_links.length; j++) {
        const tms = tms_links[j]
        const tmsInfo = TileMatrixSetsInfo[tms]
        this.wmts_layer_info[layerName][tms] = tmsInfo
      }
    }
  }
  getTileMatrixAtZoom(zoom) {
    // Calculate the tilematrix for the given zoom level
    const layer = this.mapProvider.wmts_layer_info[this.layer]
    const tms = layer[this.matrixSet]
    // const code = tms.SupportedCRS;
    // const projection = code ? getProjection(code) : getProjection('EPSG:4326');

    const unit_map = this.view.getProjection().getMetersPerUnit()
    const resolutionForZoom = this.view.getResolutionForZoom(zoom)
    const targetSD = (resolutionForZoom * unit_map) / 0.00028

    const result = tms.TileMatrix.reduce((prev, curr) => {
      if (Math.abs(curr.ScaleDenominator - targetSD) < Math.abs(prev.ScaleDenominator - targetSD)) {
        return curr
      }
      return prev
    })
    return result
  }
  getTileUrlAtZoom(zoom) {
    const tileMatrix = this.getTileMatrixAtZoom(zoom)
    const url = this.getTileUrl(tileMatrix)
    return url
  }
  refresh() {
    this.getOptions()
  }
}

class geocloudWMTSProvider extends wmtsProvider {
  constructor(config) {
    super(config)
  }

  async getCapabilities() {
    const url = new URL(this.url)
    url.searchParams.set('tk', this.token_server)

    const response_data = await window.electronAPI.getUrl(url.toString())

    const parser = new WMTSCapabilities()
    const result = parser.read(response_data)

    this.capabilities = result
  }

  getTileUrl(tileMatrix) {
    if (!this.options) {
      return
    }

    const url = new URL(this.options.urls[0])
    url.searchParams.set('service', 'wmts')
    url.searchParams.set('request', 'GetTile')
    url.searchParams.set('version', '1.0.0')
    url.searchParams.set('format', 'image/png')
    url.searchParams.set('style', 'default')
    url.searchParams.set('layer', this.layer)
    url.searchParams.set('tilematrixset', this.matrixSet)
    url.searchParams.set('tilematrix', tileMatrix)
    url.searchParams.set('tilerow', '{TileRow}')
    url.searchParams.set('tilecol', '{TileCol}')
    url.searchParams.set('tk', this.token_server)

    return url.toString()
  }

  setConfig(layer, tileMatrixSet) {
    this.layer = layer
    this.matrixSet = tileMatrixSet
    this.refresh()
  }

  getOptions() {
    const options = optionsFromCapabilities(this.capabilities, {
      layer: this.layer,
      matrixSet: this.tileMatrixSet
    })
    options.urls[0] += 'tk=' + this.token_browser
    options.tileGrid = new WMTSTileGrid({
      origins: options.tileGrid.origins_, //原点(左上角)
      resolutions: options.tileGrid.getResolutions(), //分辨率数组
      matrixIds: options.tileGrid.getMatrixIds() //矩阵标识列表，与地图级数保持一致
    })

    this.options = options
    return options
  }
}

class xyzProvider extends baseProvider {
  constructor(config) {
    super(config)
  }
}

class tiandituProvider extends xyzProvider {
  constructor(config) {
    super(config)
  }
  getUrl() {
    return this.url.replace('{token}', this.token_browser)
  }
}

const getMapProvier = async (mapConfig) => {
  let mapProvider

  if (mapConfig.type === 'WMTS') {
    switch (mapConfig.provider) {
      case 'GeoCloud':
        mapProvider = new geocloudWMTSProvider(mapConfig)
        break
      default:
        options = new wmtsProvider(mapConfig)
    }
  } else if (mapConfig.type === 'XYZ') {
    mapProvider = new xyzProvider(mapConfig)
  }

  await mapProvider.initialize()
  return mapProvider
}

export { getMapProvier }
