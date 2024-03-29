import { createCanvas, loadImage } from '@napi-rs/canvas'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import crypto from 'crypto'
import { writeArrayBuffer } from 'geotiff'
import https from 'https'
import fs from 'node:fs'

const IMG_SIZE = 256

const requestAgent = axios.create({
  responseType: 'arraybuffer',
  httpsAgent: new https.Agent({ secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT })
})

axiosRetry(requestAgent, { retries: 8, retryDelay: axiosRetry.exponentialDelay })

/**
 * Generates an array of numbers within a specified range.
 *
 * @param {number} start - The starting number of the range.
 * @param {number} end - The ending number of the range.
 * @return {number[]} An array of numbers within the specified range.
 */
const range = (start, end) => {
  return Array.from({ length: end - start }, (_, k) => k + start)
}

/**
 * Remove the alpha channel from an image data array.
 *
 * @param {Uint8ClampedArray} imageDataArray - the array containing image data with alpha channel
 * @return {Uint8ClampedArray} the array containing image data without alpha channel
 */
const removeAlpha = (imageDataArray) => {
  // This has been tested for best performance, nothing is faster!
  const numPixels = Math.floor(imageDataArray.length / 4)
  const rgbData = new Uint8ClampedArray(numPixels * 3)

  for (let i = 0; i < numPixels; i++) {
    rgbData[i * 3] = imageDataArray[i * 4]
    rgbData[i * 3 + 1] = imageDataArray[i * 4 + 1]
    rgbData[i * 3 + 2] = imageDataArray[i * 4 + 2]
  }
  return rgbData
}

/**
 * Calculate the WMTS tile range for the given level and bounding box coordinates.
 *
 * @param {number} level - The zoom level of the map.
 * @param {number} lonmin - The minimum longitude of the bounding box.
 * @param {number} latmax - The maximum latitude of the bounding box.
 * @param {number} lonmax - The maximum longitude of the bounding box.
 * @param {number} latmin - The minimum latitude of the bounding box.
 * @return {object} An object containing the column and row ranges for the tiles.
 */
const calculateWMTSTileRange = (level, lonmin, latmin, lonmax, latmax) => {
  const perTile = 180 / Math.pow(2, level)
  // Calculating tile numbers for the corners
  const colMin = Math.floor((180 + lonmin) / perTile)
  const rowMin = Math.floor((90 - latmax) / perTile)
  const colMax = Math.floor((180 + lonmax) / perTile)
  const rowMax = Math.floor((90 - latmin) / perTile)

  return {
    colRange: range(colMin, colMax + 1),
    rowRange: range(rowMin, rowMax + 1)
  }
}

/**
 * Calculate the extent of a specific WMTS tile based on the level, column, and row.
 *
 * @param {number} level - The zoom level of the tile.
 * @param {number} col - The column index of the tile.
 * @param {number} row - The row index of the tile.
 * @return {Object} An object containing the minimum and maximum longitude and latitude values of the tile extent.
 */
// const calculateWMTSTileExtent = (level, col, row) => {
//   const perTile = 180 / Math.pow(2, level)
//   // 计算经度范围
//   const lonMin = -180 + col * perTile
//   const lonMax = lonMin + perTile
//   const latMax = 90 - row * perTile
//   const latMin = latMax - perTile

//   return { lonMin, lonMax, latMin, latMax }
// }

const calcualteWMTSTilesExtent = (z, tileRange) => {
  const colRange = tileRange.colRange
  const rowRange = tileRange.rowRange
  // const upperLeftCoords = calculateWMTSTileExtent(z, colRange.at(0), rowRange.at(0))
  // const lowerRightCoords = calculateWMTSTileExtent(z, colRange.at(-1), rowRange.at(-1))

  const perTile = 180 / Math.pow(2, z)
  // 计算经度范围
  const lonMin = -180 + colRange.at(0) * perTile
  const latMax = 90 - rowRange.at(0) * perTile
  const lonMax = -180 + (colRange.at(-1) + 1) * perTile
  const latMin = 90 - (rowRange.at(-1) + 1) * perTile

  return { latMin, latMax, lonMin, lonMax }
}

/**
 * Calculates the unit length per pixel for a given bounding box and image dimensions.
 *
 * @param {Object} boundingBox - The bounding box object containing the minimum and maximum longitude and latitude values.
 * @param {number} width - The width of the image in pixels.
 * @param {number} height - The height of the image in pixels.
 * @return {Object} An object containing the unit length per pixel for longitude and latitude respectively.
 */
const calculateUintPerPixel = (boundingBox, width, height) => {
  return {
    unitLngPerPixel: (boundingBox.lonMax - boundingBox.lonMin) / width,
    unitLatPerPixel: (boundingBox.latMax - boundingBox.latMin) / height
  }
}

/**
 * Calculates the coordinates of a window within a destination canvas based on the given parameters.
 *
 * @param {Array} destCoords - An array of destination coordinates [lonMin, latMax, lonMax, latMin].
 * @param {Object} boundingBox - An object containing the bounding box coordinates {lonMin, latMax, lonMax, latMin}.
 * @param {number} unitLngPerPixel - The number of longitude units per pixel.
 * @param {number} unitLatPerPixel - The number of latitude units per pixel.
 * @return {Array} An array of window coordinates [startX, startY, width, height].
 */
const destCoords2Window = (destCoords, boundingBox, unitLngPerPixel, unitLatPerPixel) => {
  const startX = Math.round((destCoords[0] - boundingBox.lonMin) / unitLngPerPixel)
  const startY = Math.round((boundingBox.latMax - destCoords[3]) / unitLatPerPixel)

  const width = Math.round((destCoords[2] - destCoords[0]) / unitLngPerPixel)
  const height = Math.round((destCoords[3] - destCoords[1]) / unitLatPerPixel)

  return [startX, startY, width, height]
}

class datasetHandler {
  constructor(destCoords, url, z) {
    this.destCoords = destCoords //[minX, minY, maxX, maxY], range after subset
    this.tileCoords = calculateWMTSTileRange(z, ...destCoords)
    this.colRange = this.tileCoords.colRange
    this.rowRange = this.tileCoords.rowRange

    this.coordsRange = calcualteWMTSTilesExtent(z, this.tileCoords) //range before subset

    this.url = url.url
    this.params = url.params

    this.widthBeforeSubset = this.colRange.length * IMG_SIZE
    this.heightBeforeSubset = this.rowRange.length * IMG_SIZE

    if (this.widthBeforeSubset * this.heightBeforeSubset > Math.pow(2, 29)) {
      this.imageTooLarge = true
    } else {
      this.canvas = createCanvas(this.widthBeforeSubset, this.heightBeforeSubset)
      this.ctx = this.canvas.getContext('2d')
    }
  }

  async download(outputPath) {
    const { unitLngPerPixel, unitLatPerPixel } = calculateUintPerPixel(
      this.coordsRange,
      this.widthBeforeSubset,
      this.heightBeforeSubset
    )
    const destWindow = destCoords2Window(this.destCoords, this.coordsRange, unitLngPerPixel, unitLatPerPixel)

    const allPromises = []

    for (let col of this.colRange) {
      for (let row of this.rowRange) {
        allPromises.push(this.fetchImageAndSplitChannels(col, row))
      }
    }
    await Promise.all(allPromises)

    const imageData = this.ctx.getImageData(...destWindow)
    const imageDataWithoutAlpha = removeAlpha(imageData.data)

    const metadata = {
      width: destWindow[2],
      height: destWindow[3],
      ModelPixelScale: [unitLatPerPixel, unitLngPerPixel, 0],
      ModelTiepoint: [0, 0, 0, this.destCoords[0], this.destCoords[3], 0],
      SamplesPerPixel: 3,
      GeographicTypeGeoKey: 4326,
      GeoAsciiParams: 'WGS 84|',
      GeoDoubleParams: [298.257223563, 6378137.0],
      GeoKeyDirectory: [
        1, 1, 0, 7, 1024, 0, 1, 2, 1025, 0, 1, 1, 2048, 0, 1, 4326, 2049, 34737, 7, 0, 2054, 0, 1, 9102, 2057, 34736, 1,
        1, 2059, 34736, 1, 0
      ],
      GDAL_NODATA: '0 '
    }

    const arrayBuffer = await writeArrayBuffer(imageDataWithoutAlpha, metadata)
    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer))
  }

  async fetchImageAndSplitChannels(TileCol, TileRow) {
    this.params['TileRow'] = TileRow
    this.params['TileCol'] = TileCol

    try {
      const response = await requestAgent.get(this.url, { params: this.params })
      const image = await loadImage(response.data)
      const dx = (TileCol - this.colRange.at(0)) * IMG_SIZE
      const dy = (TileRow - this.rowRange.at(0)) * IMG_SIZE

      this.ctx.drawImage(image, dx, dy)
    } catch (error) {
      console.error(error)
    }
  }

  checkValid() {
    const status = { isValid: false, reason: '' }

    if (this.imageTooLarge) {
      status.reason = 'The image is too large'
    } else {
      status.isValid = true
    }

    return status
  }
}

// const main = async (url, tileMatrix, z, minX, minY, maxX, maxY) => {
//   const mapDownloader = new datasetHandler([minX, minY, maxX, maxY], url, tileMatrix, z)
//   await mapDownloader.download(outputPath)
// }

// const url = "https://igss.cgs.gov.cn:6160/igs/rest/ogc/qg20_20210401_FCnDDRJd/WMTSServer?tk=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0NDdjNTViOS05OTJjLTRlOWUtYmU2OC1iZjdlNDlhYzNlNWQifQ.10VfI2wCxmMa9dCZ51Y_KXexkSXGvfEp4KROFb1odxg&layer=qg20_20210401_FCnDDRJd&style=default&tilematrixset=EPSG:4326_qg20_20210401_FCnDDRJd_028mm_GB&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png"

// console.time('main')
// await main(url, "test2.tif", "EPSG:4326_qg20_20210401_FCnDDRJd_028mm_GB:14", 14, 113.3, 39, 113.8, 38.5);
// console.timeEnd('main')

export default (type, url, zoom, extent) => {
  let mapDownloader

  if (type === 'WMTS') {
    mapDownloader = new datasetHandler(extent, url, zoom)
  }

  return mapDownloader
}
