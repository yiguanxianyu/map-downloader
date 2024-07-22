<template>
  <div id="app">
    <div id="container">
      <div id="sidebar">
        <el-tree
          ref="treeRef"
          style="width: 100%"
          :data="mapTableData"
          show-checkbox
          draggable
          :allow-drop="allowDrop"
          highlight-current
          @current-change="handleLayerSelectChange"
        >
          <template #default="{ node, data }">
            <span class="custom-tree-node">
              <span>{{ node.label }}</span>
              <el-button type="primary" size="small" @click="handleEdit(data)">编辑</el-button>
            </span>
          </template>
        </el-tree>

        <!-- <div style="margin-bottom: 20px">
          <el-button>Add</el-button>
        </div> -->
      </div>
      <div id="map" />
    </div>

    <!-- 设置下载的界面 -->
    <el-dialog v-model="dialogDownloadMapVisible" title="下载地图">
      <el-form label-position="top" label-width="100px" :model="zoomOptions">
        <el-form-item v-for="item in zoomOptions" :label="item.label" style="width: 100%">
          <el-select v-model="item.selectedZoom" multiple>
            <el-option v-for="i in item.zoomNumbers" :key="i" :label="i" :value="i" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogDownloadMapVisible = false">取消</el-button>
          <el-button type="primary" @click="handleDownloadMap">确认</el-button>
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
        <el-form-item v-if="mapInfoForm.type === 'WMTS'" label="图层名">
          <el-select v-model="mapInfoForm.layer">
            <el-option v-for="(_, index) in layerInfo" :label="index" :value="index" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="mapInfoForm.type === 'WMTS'" label="矩阵集">
          <el-select v-model="mapInfoForm.matrixSet">
            <el-option v-for="(_, index) in layerInfo[mapInfoForm.layer]" :label="index" :value="index" />
          </el-select>
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
import { onMounted, ref, toRaw } from 'vue'

import { MapHandler } from './MapHandler'

const store = window.electronAPI.store // 全局存储

/***************
 * 图层部分
 ***************/
const treeRef = ref() // 树的引用
const mapTableData = ref(store.get('map_rules')) // 地图列表

const allowDrop = (draggingNode, dropNode, type) => {
  return type !== 'inner'
}

//点击时改变图层
const handleLayerSelectChange = (newItem) => {
  if (newItem) {
    map.changeCurrentLayer(toRaw(newItem))
  }
}
//编辑图层信息
const layerInfo = ref([])

const handleEdit = async (item) => {
  mapInfoForm.value = item
  dialogConfigVisible.value = true

  if (item.type === 'WMTS') {
    layerInfo.value = await map.getWMTSLayerInfo(toRaw(item))
  }
}

/***************
 * 地图配置部分
 ***************/
const mapInfoForm = ref({}) // 编辑地图信息
const dialogConfigVisible = ref(false) // 展示编辑地图信息的dialog

const handleUpdateMapConfig = () => {
  store.set('map_rules', toRaw(mapTableData.value))
  map.changeCurrentLayer(toRaw(mapInfoForm.value))
  dialogConfigVisible.value = false
}

/***************
 * 下载部分
 ***************/
const dialogDownloadMapVisible = ref(false) // 展示下载地图的dialog
const zoomOptions = ref([]) // 下载地图界面的缩放选项

//弹出下载框
window.electronAPI.onDownloadMap(() => {
  const selectedLayers = treeRef.value?.getCheckedNodes(true)

  if (selectedLayers.length === 0) {
    ElMessage.error('未选择图层')
    return
  }
  if (!map.hasSelectedExtent) {
    ElMessage.error('未选择下载范围')
    return
  }

  zoomOptions.value = []

  //获取可下载的缩放等级的公共部分
  for (let layer of selectedLayers) {
    zoomOptions.value.push({
      id: layer.id,
      label: layer.label,
      zoomNumbers: Array.from({ length: layer.max_zoom - layer.min_zoom + 1 }, (_, k) => k + layer.min_zoom),
      selectedZoom: [Math.max(Math.min(layer.max_zoom, map.currentZoom), layer.min_zoom)] //中位数
    })
  }
  dialogDownloadMapVisible.value = true
})

//读取shp
window.electronAPI.onReadShp((path) => {
  map.readShp(path)
})

//下载地图
const handleDownloadMap = async () => {
  const selectedLayers = treeRef.value?.getCheckedNodes(true)

  const configs = []

  // zoomOptions和selectedRows是长度相同的数组，长度是选择的图层数量
  const promises = selectedLayers.map(async (layer, i) => {
    const zoomOption = zoomOptions.value[i]
    const row = toRaw(layer)

    const extent = map.getCurrentSelectedExtentForLayer(layer)

    const currConfig = {
      name: row.layer,
      type: row.type,
      extent: extent,
      urls: []
    }

    await Promise.all(
      zoomOption.selectedZoom.map(async (zoom) => {
        const url = await map.getTileUrlAtZoom(row, zoom)
        currConfig.urls.push({ url, zoom })
      })
    )

    configs.push(currConfig)
  })

  await Promise.all(promises)

  window.electronAPI.downloadMap(configs)

  dialogDownloadMapVisible.value = false
}

/***************
 * 地图部分
 ***************/
const map = new MapHandler()
// 将当前地图视角设为extent
window.electronAPI.extent.setCurrentViewAsExtent(() => {
  map.setCurrentViewAsExtent()
})

onMounted(() => {
  map.setTarget('map')
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

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  padding-left: 0;
  padding-right: 8px;
}

:deep(.el-tree-node__expand-icon) {
  padding: 4px;
  width: 0px;
}

:deep(.el-tree-node__content) {
  height: 30px;
}
</style>
