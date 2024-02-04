<template>
  <div id="app">
    <div id="container">
      <div id="sidebar">
        <el-table
          ref="multipleTableRef"
          :data="mapTableData"
          style="width: 100%"
          size="small"
          highlight-current-row
          @current-change="handleLayerSelectChange"
          height="95vh"
        >
          <el-table-column label="图层" show-overflow-tooltip>
            <template #default="scope">{{ scope.row.label }}</template>
          </el-table-column>
          <el-table-column type="selection" width="25px" fixed="right" />
          <el-table-column fixed="right" label="操作" width="60px">
            <template #default="scope">
              <el-button type="primary" size="small" @click="handleEdit(scope.row)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div style="margin-bottom: 20px">
          <el-button @click="">Add</el-button>
        </div>
      </div>
      <div id="map" />
    </div>

    <!-- 设置下载的界面 -->
    <el-dialog v-model="dialogDownloadMapVisible" title="下载地图">
      <el-form label-position="top" label-width="100px" :model="zoomOptions">
        <el-form-item v-for="item in zoomOptions" :label="item.label" style="width: 100%">
          <el-select v-model="item.selectedZoom" multiple>
            <el-option
              v-for="i in item.maxZoom - item.minZoom + 1"
              :key="i"
              :label="i + item.minZoom - 1"
              :value="i + item.minZoom - 1"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogDownloadMapVisible = false">取消</el-button>
          <el-button type="primary" @click="downloadMap"> 确认 </el-button>
        </span>
      </template>
    </el-dialog>
    <!-- 编辑地图配置的界面 -->
    <el-dialog v-model="dialogConfigVisible" title="配置地图">
      <el-form :model="mapInfoForm" label-width="120px">
        <el-form-item label="地图名">
          <el-input v-model="mapInfoForm.label" />
        </el-form-item>
        <el-form-item label="URL">
          <el-input v-model="mapInfoForm.url" />
        </el-form-item>
        <el-form-item label="浏览器端token">
          <el-input v-model="mapInfoForm.token_browser" />
        </el-form-item>
        <el-form-item label="服务器端token">
          <el-input v-model="mapInfoForm.token_server" />
        </el-form-item>
        <el-form-item label="服务提供商">
          <el-input v-model="mapInfoForm.provider" />
        </el-form-item>
        <el-form-item label="瓦片类型">
          <el-select v-model="mapInfoForm.type" placeholder="瓦片类型">
            <el-option label="WMTS" value="WMTS" />
            <el-option label="XYZ" value="XYZ" />
          </el-select>
        </el-form-item>
        <el-form-item label="投影">
          <el-select v-model="mapInfoForm.projection" placeholder="投影">
            <el-option label="EPSG:4326 (WGS84)" value="EPSG:4326" />
            <el-option label="EPSG:3857 (Web Mercator)" value="EPSG:3857" />
          </el-select>
        </el-form-item>
        <el-form-item label="图层名">
          <el-input v-model="mapInfoForm.layer" />
        </el-form-item>
        <el-form-item label="矩阵集">
          <el-input v-model="mapInfoForm.matrixSet" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogConfigVisible = false">取消</el-button>
          <el-button type="primary" @click="handleUpdateMapConfig"> 确认 </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
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

const store = window.electronAPI.store // 全局存储

const multipleTableRef = ref() //表格的引用
const mapTableData = ref(store.get('map_rules')) // 地图列表

const mapInfoForm = ref({}) // 编辑地图信息
const dialogConfigVisible = ref(false) // 展示编辑地图信息的dialog

const extentVec = new VectorSource({ wrapX: false }) // 存储范围的矢量图层
const customLayer = new Collection([]) // 当前显示的图层

const dialogDownloadMapVisible = ref(false) // 展示下载地图的dialog
const zoomOptions = ref([]) // 下载地图界面的缩放选项

const getCurrentZoom = () => {
  return Math.round(map.getView().values_.zoom)
}
const getCurrentViewExtent = () => {
  return map.getView().calculateExtent(map.getSize())
}
const getCurrentSelectExtent = () => {
  return extentVec.getExtent()
}

const handleUpdateMapConfig = () => {
  store.set('map_rules', toRaw(mapTableData.value))
  dialogConfigVisible.value = false
}

// 下载部分
//弹出下载框
window.electronAPI.onDownloadMap(() => {
  const selectedRows = multipleTableRef.value?.getSelectionRows()

  if (selectedRows.length === 0) {
    ElMessage.error('未选择图层')
    return
  }
  if (getCurrentSelectExtent()[0] === Infinity) {
    ElMessage.error('未选择下载范围')
    return
  }

  zoomOptions.value = []

  //获取可下载的缩放等级的公共部分
  for (let i = 0; i < selectedRows.length; i++) {
    const row = selectedRows[i]
    zoomOptions.value.push({
      id: row.id,
      label: row.label,
      minZoom: row.min_zoom,
      maxZoom: row.max_zoom,
      selectedZoom: [row.max_zoom, row.min_zoom, getCurrentZoom()].sort((a, b) => a - b).slice(1, 2) //中位数
    })
  }
  dialogDownloadMapVisible.value = true
})

const downloadMap = () => {
  const extent = getCurrentSelectExtent()
  const selectedRows = multipleTableRef.value?.getSelectionRows()
  const configs = []

  for (let i = 0; i < selectedRows.length; i++) {
    // const row = toRaw(selectedRows[i])
    zoomOptions.value[i].selectedZoom.forEach((zoom) => {
      configs.push({ row: toRaw(selectedRows[i]), zoom: zoom })
    })
  }
  console.log(extent)
  window.electronAPI.downloadMap(configs, extent)

  dialogDownloadMapVisible.value = false
}

//点击时改变图层
const handleLayerSelectChange = (newItem, _oldItem) => {
  if (newItem) {
    customLayer.clear()
    customLayer.push(generateLayer(newItem))
  }
}
//编辑图层信息
const handleEdit = (item) => {
  for (let i of mapTableData.value) {
    if (i.id === item.id) {
      mapInfoForm.value = i
    }
  }
  dialogConfigVisible.value = true
  console.log(item)
}

//地图部分

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
// 将当前地图视角设为extent
window.electronAPI.extent.setCurrentViewAsExtent(() => {
  draw.setActive(false)
  extentVec.clear()
  extentVec.addFeature(
    new Feature({
      geometry: fromExtent(getCurrentViewExtent())
    })
  )
})
//手动绘制extent
window.electronAPI.extent.drawRectangleAsExtent(() => {
  draw.setActive(true)
  extentVec.clear()
})
// 清空extent
window.electronAPI.extent.clearExtent(() => {
  extentVec.clear()
})

//初始化地图
const map = new Map({
  layers: [tiandituLayer, new LayerGroup({ layers: customLayer }), new VectorLayer({ source: extentVec })],
  view: new View({
    center: [12000000, 5000000],
    zoom: 3,
    maxZoom: 18,
    extent: transformExtent([60, 0, 150, 60], 'EPSG:4326', 'EPSG:3857')
  }),
  controls: [new Zoom(), new Attribution()]
})
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
