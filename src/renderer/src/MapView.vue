<script setup>
import { onMounted } from 'vue'
import { useUsersStore } from '@/user.js'
import 'ol/ol.css'

const store = useUsersStore()

onMounted(() => {
  const mapElement = document.getElementById('map')
  store.map.setTarget(mapElement)
})
</script>

<template>
  <div id="map"></div>
</template>

<style>
.ol-zoom {
  top: unset;
  right: 10px;
  bottom: 30px;
  left: unset;
  background-color: #e0e0e0;
}

.ol-attribution {
  top: unset;
  right: 10px;
  bottom: 5px;
  left: unset;
  background-color: #e0e0e0;
}

.ol-attribution ul {
  text-shadow: unset;
  font-weight: 600;
}

.ol-attribution a {
  color: #2669dd;
}

#map {
  --ol-background-color: rgba(33, 33, 33, 0.95);
  --ol-subtle-foreground-color: #ffffff;
  --ol-partial-background-color: #f0f0f0;
}
</style>
