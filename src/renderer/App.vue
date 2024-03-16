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
        <el-form-item label="图层名" v-if="mapInfoForm.type === 'WMTS'">
          <el-select v-model="mapInfoForm.layer">
            <el-option v-for="(_, index) in layerInfo" :label="index" :value="index" />
          </el-select>
        </el-form-item>
        <el-form-item label="矩阵集" v-if="mapInfoForm.type === 'WMTS'">
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
const multipleTableRef = ref() // 表格的引用
const mapTableData = ref(store.get('map_rules')) // 地图列表

//点击时改变图层
const handleLayerSelectChange = (newItem, _oldItem) => {
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
  const selectedRows = multipleTableRef.value?.getSelectionRows()

  if (selectedRows.length === 0) {
    ElMessage.error('未选择图层')
    return
  }
  if (!map.hasSelectedExtent) {
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
      selectedZoom: [row.max_zoom, row.min_zoom, map.currentZoom].sort((a, b) => a - b).slice(1, 2) //中位数
    })
  }
  dialogDownloadMapVisible.value = true
})
//下载地图
const handleDownloadMap = () => {
  const extent = map.currentSelectedExtent
  const selectedRows = multipleTableRef.value?.getSelectionRows()
  const configs = []
  //zoomOptions和selectedRows是长度相同的数组，长度是选择的图层数量
  for (let i = 0; i < selectedRows.length; i++) {
    const zoomOption = zoomOptions.value[i]
    const row = toRaw(selectedRows[i])
    zoomOption.selectedZoom.forEach((zoom) => {
      const layer = row.layer
      const matrixSet = row.matrixSet
      const tileMatrix = map.getTileMatrix(layer, matrixSet, zoom)
      window.electronAPI.downloadMap(tileMatrix, extent)
      configs.push({
        layer: row.layer,
        matrixSet: row.matrixSet,
        zoom: zoom
      })
      // const url = new URL(options.urls[0])
    })
  }
  console.log(configs)
  // window.electronAPI.downloadMap(configs, extent)

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
</style>
