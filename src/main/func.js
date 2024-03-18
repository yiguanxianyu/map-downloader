import axios from 'axios';
import crypto from 'crypto';
import gdal from 'gdal-async';
import https from 'https';
import sharp from 'sharp';

import axiosRetry from 'axios-retry';

const IMG_SIZE = 256
const requestHandler = axios.create({
    responseType: 'arraybuffer',
    httpsAgent: new https.Agent({ secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT })
});

axiosRetry(requestHandler, { retries: 3 });

/**
 * Generates an array of integers within a specified range, similar to Python.
 *
 * @param {number} start - The start value of the range (inclusive).
 * @param {number} end - The end value of the range (exclusive).
 * @return {number[]} An array containing the sequence of integers.
 */
const range = (start, end) => {
    return Array.from({ length: end - start }, (v, k) => k + start);
}

/**
 * Calculate the WMTS tile range for the given level and bounding box coordinates.
 *
 * @param {number} level - The zoom level of the map.
 * @param {number} lngmin - The minimum longitude of the bounding box.
 * @param {number} latmax - The maximum latitude of the bounding box.
 * @param {number} lngmax - The maximum longitude of the bounding box.
 * @param {number} latmin - The minimum latitude of the bounding box.
 * @return {object} An object containing the column and row ranges for the tiles.
 */
const calculateWMTSTileRange = (level, lngmin, latmax, lngmax, latmin) => {
    const perTile = 180 / Math.pow(2, level);
    // Calculating tile numbers for the corners
    const colMin = Math.floor((180 + lngmin) / perTile)
    const rowMin = Math.floor((90 - latmax) / perTile)
    const colMax = Math.floor((180 + lngmax) / perTile)
    const rowMax = Math.floor((90 - latmin) / perTile)

    return {
        colRange: range(colMin, colMax + 1),
        rowRange: range(rowMin, rowMax + 1)
    };
}

const calculateWMTSTileExtent = (level, col, row) => {
    const perTile = 180 / Math.pow(2, level); // 每个瓦片的经度跨度
    // 计算经度范围
    const lonMin = -180 + col * perTile
    const lonMax = lonMin + perTile
    const latMax = 90 - row * perTile;
    const latMin = latMax - perTile;

    return { lonMin, lonMax, latMin, latMax };
}


const calcualteWMTSTilesExtent = (level, tileRange) => {
    const colRange = tileRange.colRange
    const rowRange = tileRange.rowRange
    const upperLeftCoords = calculateWMTSTileExtent(level, colRange.at(0), rowRange.at(0))
    const lowerRightCoords = calculateWMTSTileExtent(level, colRange.at(-1), rowRange.at(-1))

    return {
        latMin: lowerRightCoords.latMin,
        latMax: upperLeftCoords.latMax,
        lonMin: upperLeftCoords.lonMin,
        lonMax: lowerRightCoords.lonMax
    }
}

class mapDownloader {
    constructor(destCoords, url, tileMatrix, z) {
        this.destCoords = destCoords
        const tileRange = calculateWMTSTileRange(z, ...destCoords)
        this.tileRange = tileRange

        this.url = url
        this.tileMatrix = tileMatrix

        this.width = tileRange.colRange.length * IMG_SIZE
        this.height = tileRange.rowRange.length * IMG_SIZE

        this.col_min = tileRange.colRange.at(0)
        this.row_min = tileRange.rowRange.at(0)

        const coordsRange = calcualteWMTSTilesExtent(z, tileRange)

        this.dest_dataset = gdal.open("/vsimem/temp.tif", "w", "GTiff", this.width, this.height, 3, "Byte")
        this.dest_dataset.srs = gdal.SpatialReference.fromEPSG(4326);
        this.dest_dataset.geoTransform =
            [
                coordsRange.lonMin,
                (coordsRange.lonMax - coordsRange.lonMin) / this.width,
                0,
                coordsRange.latMax,
                0,
                (coordsRange.latMin - coordsRange.latMax) / this.height
            ]
    }

    download(outputPath) {
        const promises = []

        for (let col of this.tileRange.colRange) {
            for (let row of this.tileRange.rowRange) {
                const promise = this.fetchImageAndSplitChannels(this.url, this.tileMatrix, col, row)
                promises.push(promise)
            }
        }

        Promise.all(promises).then(() => {
            gdal.translate(outputPath, this.dest_dataset, ['-projwin', ... this.destCoords, '-co', 'COMPRESS=deflate'])
        })
    }

    async fetchImageAndSplitChannels(url, TileMatrix, TileCol, TileRow) {
        try {
            const response = await requestHandler.get(url, {
                params: { TileMatrix, TileCol, TileRow }
            });
            const buffer = response.data;
            const image = sharp(buffer).removeAlpha()
            const imageBuffer = await image.raw().toBuffer()
            const rawImageArr = new Uint8Array(imageBuffer);
            const imageArr = [[], [], []];
            rawImageArr.forEach((value, index) => imageArr[index % 3].push(value))
            const channels = imageArr.map(channel => Uint8Array.from(channel))

            this.dest_dataset.bands.forEach((band, i) => {
                const xStart = (TileCol - this.col_min) * IMG_SIZE
                const yStart = (TileRow - this.row_min) * IMG_SIZE
                band.pixels.write(xStart, yStart, IMG_SIZE, IMG_SIZE, channels[i - 1])
            })
        } catch (error) {
            console.error(error);
        }
    }
}

// const main = (url, outputPath, tileMatrix, z, minX, minY, maxX, maxY) => {
//     const mapDownloader = new datasetHandler([minX, minY, maxX, maxY], url, tileMatrix, z);
//     mapDownloader.download(outputPath)
// }

// const url = "https://igss.cgs.gov.cn:6160/igs/rest/ogc/qg20_20210401_FCnDDRJd/WMTSServer?tk=eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0NDdjNTViOS05OTJjLTRlOWUtYmU2OC1iZjdlNDlhYzNlNWQifQ.10VfI2wCxmMa9dCZ51Y_KXexkSXGvfEp4KROFb1odxg&layer=qg20_20210401_FCnDDRJd&style=default&tilematrixset=EPSG:4326_qg20_20210401_FCnDDRJd_028mm_GB&Service=WMTS&Request=GetTile&Version=1.0.0&Format=image/png"
// main(url, "test2.tif", "EPSG:4326_qg20_20210401_FCnDDRJd_028mm_GB:14", 14, 121.5, 39, 121.6, 38.9);

export default mapDownloader