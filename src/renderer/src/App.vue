<template>
  <div id="app">
    <MapView id="map" />
    <button id="download_btn" type="button" @click="downloadHandler">下载</button>
  </div>
</template>

<script setup>
import MapView from '@/MapView.vue'
import { useUsersStore } from '@/user.js'

const store = useUsersStore()

const downloadHandler = () => {
  const map = store.map
  const view = map.getView()
  const currentZoom = Math.round(view.values_.zoom)
  const currentExtent = view.calculateExtent(map.getSize())

  window.electronAPI.downloadMap(currentZoom, currentExtent)
}
</script>

<style scoped>
#app {
  position: relative;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

#map {
  height: 100%;
  width: 100%;
}

#download_btn {
  position: absolute;
  top: 5px;
  right: 5px;
}
</style>
