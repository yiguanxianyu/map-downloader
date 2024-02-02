<template>
  <div id="app">
    <div id="map" />

    <!-- 设置token的界面 -->
    <el-dialog v-model="tokenDialogFormVisible" title="设置Token">
      <el-form :model="tokenForm">
        <el-form-item v-for="(_, key) in tokenForm" :key="key" :label="key" :label-width="formLabelWidth">
          <el-input v-model="tokenForm[key]"></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="tokenDialogFormVisible = false">取消</el-button>
          <el-button type="primary" @click="updateToken"> 确认 </el-button>
        </span>
      </template>
    </el-dialog>
    <!-- 设置下载的界面 -->
    <el-dialog v-model="dialogFormVisible" title="下载地图">
      <el-select v-model="zoomValue" multiple placeholder="Select" style="width: 100%">
        <el-option v-for="item in zoomOptions" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogFormVisible = false">Cancel</el-button>
          <el-button type="primary" @click="downloadMap">
            Confirm
          </el-button>
        </span>
      </template>
    </el-dialog>

  </div>
</template>

<script setup>
import { onMounted, ref, toRaw } from 'vue'
import 'ol/ol.css'
import View from 'ol/View'
import LayerGroup from 'ol/layer/Group'
import Map from 'ol/Map'
import TileLayer from 'ol/layer/Tile'
import XYZ from 'ol/source/XYZ'
import Zoom from 'ol/control/Zoom'
import Attribution from 'ol/control/Attribution'

let map = null
const API_KEY = import.meta.env.RENDERER_VITE_API_KEY.toString()

const getCurrentZoom = () => {
  return Math.round(map.getView().values_.zoom)
}

const getCurrentExtent = () => {
  return map.getView().calculateExtent(map.getSize())
}

// token设置部分
const tokenDialogFormVisible = ref(false)
const formLabelWidth = '140px'

const tokenForm = ref({})

window.electronAPI.onUpdateToken((currentToken) => {
  tokenForm.value = currentToken
  tokenDialogFormVisible.value = true
})

const updateToken = () => {
  window.electronAPI.updateToken(toRaw(tokenForm.value))
  tokenDialogFormVisible.value = false
}
// token设置部分

// 下载部分
const dialogFormVisible = ref(false)

const zoomValue = ref([])

const zoomOptions = Array.from({ length: 19 - 6 + 1 }, (_, index) => ({
  value: index + 6,
  label: index + 6
}));

window.electronAPI.onDownloadMap(() => {
  zoomValue.value = [getCurrentZoom()]
  dialogFormVisible.value = true
})

const downloadMap = () => {
  const extent = getCurrentExtent()
  zoomValue.value.forEach(zoom => {
    window.electronAPI.downloadMap(extent, zoom)
  })
  dialogFormVisible.value = false
}
// 下载部分

onMounted(() => {
  map = new Map({
    target: 'map',
    layers: new LayerGroup({
      layers: [
        new TileLayer({
          title: '天地图卫星影像',
          source: new XYZ({
            url: 'https://t4.tianditu.gov.cn/DataServer?T=img_w&x={x}&y={y}&l={z}&tk=' + API_KEY,
            attributions: ['Map data &copy; <a href="https://www.tianditu.gov.cn/">天地图</a>']
          })
        }),
        new TileLayer({
          title: '天地图影像标注',
          source: new XYZ({
            url: 'https://t4.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=' + API_KEY
          })
        })
      ]
    }),
    view: new View({
      center: [12946790, 4864489],
      zoom: 6,
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
