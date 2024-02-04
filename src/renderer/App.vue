<template>
  <div id="app">
    <div id="container">
      <div id="sidebar">
        <el-table
          ref="multipleTableRef"
          :data="tableData"
          style="width: 100%"
          size="small"
          highlight-current-row
          @current-change="handleLayerSelectChange"
          height="90vh"
        >
          <el-table-column type="selection" width="30px" fixed="left" />
          <el-table-column label="label" show-overflow-tooltip>
            <template #default="scope">{{ scope.row.label }}</template>
          </el-table-column>
          <el-table-column fixed="right" label="操作" width="50px">
            <template #default>
              <el-button link type="primary" size="small" @click="handleEdit">Edit</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-bottom: 20px">
          <el-button @click="toggleSelection()">Add</el-button>
        </div>
      </div>
      <div id="map" />
    </div>

    <!-- 设置token的界面 -->
    <el-dialog v-model="tokenDialogFormVisible" title="设置Token" style="width: 80%">
      <el-form :model="tokenForm">
        <el-form-item
          v-for="item in tokenForm"
          :label="item.label + '(浏览器端)'"
          label-width="60%"
        >
          <el-input v-model="item.token_browser"></el-input>
        </el-form-item>
        <el-form-item
          v-for="item in tokenForm"
          :label="item.label + '(服务器端)'"
          label-width="60%"
        >
          <el-input v-model="item.token_server"></el-input>
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
        <el-option
          v-for="item in zoomOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        />
      </el-select>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogFormVisible = false">Cancel</el-button>
          <el-button type="primary" @click="downloadMap"> Confirm </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { Feature } from 'ol'
import Collection from 'ol/Collection.js'
import Map from 'ol/Map'
import View from 'ol/View'
import Attribution from 'ol/control/Attribution'
import Zoom from 'ol/control/Zoom'
import { fromExtent } from 'ol/geom/Polygon'
import Draw, { createBox } from 'ol/interaction/Draw'
import LayerGroup from 'ol/layer/Group'
import VectorLayer from 'ol/layer/Vector'
import 'ol/ol.css'
import { transformExtent } from 'ol/proj'
import VectorSource from 'ol/source/Vector'
import { onMounted, ref, toRaw } from 'vue'

import { generateLayer, tiandituLayer } from './Map'

const store = window.electronAPI.store

const tableData = store.get('map_rules')

// Get zoom for current view
const getCurrentZoom = () => {
  return Math.round(map.getView().values_.zoom)
}
// Get extent for current view
const getCurrentMapExtent = () => {
  return map.getView().calculateExtent(map.getSize())
}

const getCurrentSelectExtent = () => {
  return extentVec.getExtent()
}

// Set token
const tokenDialogFormVisible = ref(false)
const tokenForm = ref({})

// Callback for event onUpdateToken
window.electronAPI.onUpdateToken(() => {
  tokenForm.value = store.get('map_rules')
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

const zoomOptions = Array.from({ length: 19 }, (_, index) => ({
  value: index + 1,
  label: index + 1
}))

window.electronAPI.onDownloadMap(() => {
  zoomValue.value = [getCurrentZoom()]
  dialogFormVisible.value = true
})

const downloadMap = () => {
  const extent = getCurrentMapExtent()
  zoomValue.value.forEach((zoom) => {
    window.electronAPI.downloadMap(extent, zoom)
  })
  dialogFormVisible.value = false
}

//地图部分
const customLayer = new Collection([])
const extentVec = new VectorSource({ wrapX: false })

// 创建交互绘制对象
const draw = new Draw({
  source: extentVec,
  type: 'Circle',
  geometryFunction: createBox()
})

// 监听绘制结束事件,绘制完成后关闭绘制功能
draw.on('drawend', (event) => {
  draw.setActive(false)
})

// 将当前地图视角设为polygon
window.electronAPI.extent.setCurrentViewAsExtent(() => {
  const polygonFeature = new Feature({
    geometry: fromExtent(getCurrentMapExtent())
  })
  extentVec.clear()
  extentVec.addFeature(polygonFeature)
})

window.electronAPI.extent.drawRectangleAsExtent(() => {
  draw.setActive(true)
  extentVec.clear()
})

const map = new Map({
  layers: [
    tiandituLayer,
    new LayerGroup({ layers: customLayer }),
    new VectorLayer({ source: extentVec })
  ],
  view: new View({
    center: [12000000, 5000000],
    zoom: 3,
    maxZoom: 18,
    extent: transformExtent([60, 0, 150, 60], 'EPSG:4326', 'EPSG:3857')
  }),
  controls: [new Zoom(), new Attribution()]
})

const handleLayerSelectChange = (newItem, _oldItem) => {
  if (newItem) {
    customLayer.clear()
    customLayer.push(generateLayer(newItem))
  }
}

const handleEdit = (item) => {
  console.log(item)
}
//地图部分

onMounted(() => {
  map.setTarget('map')
  draw.setActive(false)
  map.addInteraction(draw)
})
</script>

<style scoped>
#app {
  position: absolute;
  height: 100%;
  width: 100%;
}

#container {
  display: flex;
  height: 100%;
}

#sidebar {
  width: 270px;
  position: relative;
  height: 100%;
}

#map {
  flex: 1;
  position: relative;
  height: 100%;
  width: 100%;
  --ol-background-color: rgba(33, 33, 33, 0.95);
  --ol-subtle-foreground-color: #ffffff;
  --ol-partial-background-color: #f0f0f0;
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
