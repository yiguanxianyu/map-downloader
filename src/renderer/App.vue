<template>
  <div id="app">
    <div id="map" />
    <button id="download_btn" type="button" @click="downloadHandler">下载</button>
    <button id="change_token_btn" type="button" @click="setDwldToken">设置Token</button>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import 'ol/ol.css'
import View from 'ol/View'
import LayerGroup from 'ol/layer/Group'
import Map from 'ol/Map'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import Zoom from 'ol/control/Zoom'
import Attribution from 'ol/control/Attribution'

let map = null
let API_KEY = import.meta.env.RENDERER_VITE_API_KEY.toString()

const tiandituTileLayerGroup = new LayerGroup({
  layers: [
    new TileLayer({
      title: '天地图卫星影像',
      source: new XYZ({
        url: 'https://t4.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=' + API_KEY,
        attributions: ['Map data &copy; <a href="https://www.tianditu.gov.cn/">天地图</a>']
      })
    }),
    new TileLayer({
      title: '标注图层',
      source: new XYZ({
        url: 'https://t4.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=' + API_KEY
      })
    })
  ]
})

const downloadHandler = () => {
  const view = map.getView()
  const currentZoom = Math.round(view.values_.zoom)
  const currentExtent = view.calculateExtent(map.getSize())
  window.electronAPI.downloadMap(currentZoom, currentExtent)
}

const setDwldToken = () => {
  window.electronAPI.setDwldToken()
}

onMounted(() => {
  map = new Map({
    target: 'map',
    layers: tiandituTileLayerGroup,
    view: new View({
      center: [12946790, 4864489],
      zoom: 12,
      maxZoom: 18
    }),
    controls: [new Zoom(), new Attribution()]
  })
})
</script>

<style scoped>
#app {
  position: relative;
  height: 100vh;
  width: 100vw;
}

#map {
  height: 100%;
  width: 100%;
  --ol-background-color: rgba(33, 33, 33, 0.95);
  --ol-subtle-foreground-color: #ffffff;
  --ol-partial-background-color: #f0f0f0;
}

#download_btn {
  position: absolute;
  top: 5px;
  right: 5px;
  height: 2.5em;
  width: 4em;
}

#change_token_btn {
  position: absolute;
  top: 3.5em;
  right: 5px;
  height: 4em;
  width: 4em;
}

:deep(.ol-zoom) {
  top: unset;
  right: 10px;
  bottom: 30px;
  left: unset;
  background-color: #e0e0e0;
}

:deep(.ol-attribution) {
  top: unset;
  right: 10px;
  bottom: 5px;
  left: unset;
  background-color: #e0e0e0;
}

:deep(.ol-attribution ul) {
  text-shadow: unset;
  font-weight: 600;
}

:deep(.ol-attribution a) {
  color: #2669dd;
}
</style>
