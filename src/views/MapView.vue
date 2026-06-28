<script setup lang="ts">
/**
 * MapView —— 地图视图入口（地图功能 Agent 核心交付）
 *
 * 在 BaseMap 暴露的 container ref 上实例化 maplibre.Map + deck.gl MapboxOverlay，
 * 组装照片/地点/聚类三层 deck.gl 图层，管理选中与悬停状态，渲染详情面板与 tooltip。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { Layer } from '@deck.gl/core'
import type { MapClusterFeature, MapBounds, MapPointFeature } from '@/types'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import BaseMap from '@/components/BaseMap.vue'
import LoadingScreen from '@/components/LoadingScreen.vue'
import MapTooltip from '@/components/map/MapTooltip.vue'
import MapDetailOverlay from '@/components/map/MapDetailOverlay.vue'
import MapFilterPanel, { type MapFilter } from '@/components/map/MapFilterPanel.vue'
import { useSupercluster } from '@/components/map/composables/useSupercluster'
import { createPhotoLayer, type PointLayerHandlers } from '@/components/map/layers/createPhotoLayer'
import { createPlaceLayer } from '@/components/map/layers/createPlaceLayer'
import { createClusterLayer, type ClusterLayerHandlers } from '@/components/map/layers/createClusterLayer'

type AnyFeature = MapPointFeature | MapClusterFeature
interface HoverState {
  x: number
  y: number
  kind: 'photo' | 'place' | 'cluster'
  title: string
  thumbnail?: string
  date?: string | null
  locationName?: string
  stageName?: string
  albumName?: string
  count?: number
}

const data = useDataStore()
const ui = useUiStore()

const baseMapRef = ref<{ container: HTMLDivElement | null } | null>(null)
const mapInstance = ref<maplibregl.Map | null>(null)
const overlayRef = ref<MapboxOverlay | null>(null)

const hover = ref<HoverState | null>(null)
const zoom = ref(3)
const bounds = ref<MapBounds>({ west: -180, south: -90, east: 180, north: 90 })

const filter = ref<MapFilter>({ kind: 'all', stageId: null, albumId: null })

// —— 数据 → GeoJSON 点 ——
const points = computed<MapPointFeature[]>(() => [
  ...data.photosWithLocation.map((p) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [p.location!.longitude, p.location!.latitude] as [number, number] },
    properties: {
      kind: 'photo' as const,
      id: p.id,
      name: p.caption ?? p.location?.name,
      thumbnail: p.thumbnail,
      date: p.date,
      stageId: p.stageId,
      albumId: p.albumId,
      locationName: p.location?.name,
    },
  })),
  ...data.placesWithLocation.map((pl) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [pl.location!.longitude, pl.location!.latitude] as [number, number] },
    properties: { kind: 'place' as const, id: pl.id, name: pl.name },
  })),
])

const filteredPoints = computed<MapPointFeature[]>(() => {
  return points.value.filter((f) => {
    const props = f.properties
    if (filter.value.kind !== 'all' && props.kind !== filter.value.kind) return false
    if (filter.value.stageId && props.stageId !== filter.value.stageId && props.kind !== 'place') return false
    if (filter.value.albumId) {
      if (props.kind !== 'photo') return false
      if (props.albumId !== filter.value.albumId) return false
    }
    return true
  })
})

const { getClusters, getExpansionZoom } = useSupercluster(filteredPoints)

// —— 视口 → 聚类/单点 ——
const features = computed<AnyFeature[]>(() =>
  getClusters([bounds.value.west, bounds.value.south, bounds.value.east, bounds.value.north], zoom.value),
)

function isCluster(f: AnyFeature): f is MapClusterFeature {
  return (f.properties as { cluster?: unknown }).cluster === true
}

const clusters = computed<MapClusterFeature[]>(() => features.value.filter(isCluster))
const singlePoints = computed<MapPointFeature[]>(() => features.value.filter((f): f is MapPointFeature => !isCluster(f)))
const photoPoints = computed<MapPointFeature[]>(() => singlePoints.value.filter((f) => f.properties.kind === 'photo'))
const placePoints = computed<MapPointFeature[]>(() => singlePoints.value.filter((f) => f.properties.kind === 'place'))

// —— 交互回调 ——
const pointHandlers: PointLayerHandlers = {
  onSelect: (kind, id) => {
    if (kind === 'photo') ui.selectPhoto(id)
    else ui.selectPlace(id)
  },
  onHover: (info) => {
    const obj = info.object
    if (!obj) {
      hover.value = null
      return
    }
    const props = obj.properties
    const kind = props.kind
    hover.value = {
      x: info.x,
      y: info.y,
      kind,
      title: props.name ?? (kind === 'photo' ? '照片' : '地点'),
      thumbnail: kind === 'photo' ? props.thumbnail : undefined,
      date: kind === 'photo' ? props.date : undefined,
      locationName: kind === 'photo' ? props.locationName : undefined,
      stageName: kind === 'photo' && props.stageId ? data.getStage(props.stageId)?.name : undefined,
      albumName: kind === 'photo' && props.albumId ? data.getAlbum(props.albumId)?.title : undefined,
    }
  },
}

const clusterHandlers: ClusterLayerHandlers = {
  onExpand: (clusterId, coords) => {
    const target = Math.min(getExpansionZoom(clusterId) + 0.5, 18)
    mapInstance.value?.easeTo({ center: coords, zoom: target, duration: 600 })
  },
  onHover: (info) => {
    hover.value = info.object
      ? {
          x: info.x,
          y: info.y,
          kind: 'cluster',
          title: '照片聚类',
          count: info.object.properties.point_count,
        }
      : null
  },
}

// —— 图层数组（cluster 底，place 中，photo 顶） ——
const layers = computed<Layer[]>(() => [
  ...createClusterLayer(clusters.value, clusterHandlers),
  createPlaceLayer(placePoints.value, pointHandlers),
  createPhotoLayer(photoPoints.value, pointHandlers),
])

watch(layers, (ls) => {
  overlayRef.value?.setProps({ layers: ls })
})

// —— 初始视野 ——
const initialBounds = computed<[[number, number], [number, number]]>(() => {
  if (filteredPoints.value.length === 0) return [[100, 20], [120, 40]]
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const p of filteredPoints.value) {
    const [lng, lat] = p.geometry.coordinates
    if (lng < minLng) minLng = lng
    if (lat < minLat) minLat = lat
    if (lng > maxLng) maxLng = lng
    if (lat > maxLat) maxLat = lat
  }
  return [[minLng, minLat], [maxLng, maxLat]]
})

// —— 视口同步（防抖） ——
let moveTimer: ReturnType<typeof setTimeout> | null = null

function syncView() {
  if (!mapInstance.value) return
  zoom.value = mapInstance.value.getZoom()
  const b = mapInstance.value.getBounds()
  bounds.value = { west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() }
}

function onMove() {
  if (moveTimer) clearTimeout(moveTimer)
  moveTimer = setTimeout(syncView, 150)
}

// —— 拿到 BaseMap 暴露的 container DOM（兼容 ref 自动解包与未解包两种情况） ——
function getContainerEl(): HTMLDivElement | null {
  const exposed = baseMapRef.value as { container: unknown } | null
  if (!exposed) return null
  const c = exposed.container
  if (c instanceof HTMLDivElement) return c
  if (c && typeof c === 'object' && 'value' in c) {
    const v = (c as { value: HTMLDivElement | null }).value
    return v instanceof HTMLDivElement ? v : null
  }
  return null
}

// —— 实例化 maplibre + deck.gl ——
async function initMap() {
  if (!data.loaded) await data.load()
  const container = getContainerEl()
  if (!container) return

  const map = new maplibregl.Map({
    container,
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    center: [110, 32],
    zoom: 3,
  })
  const overlay = new MapboxOverlay({ interleaved: false, layers: [] })
  map.addControl(overlay)
  map.addControl(new maplibregl.NavigationControl(), 'top-right')

  map.on('load', () => {
    overlay.setProps({ layers: layers.value })
    map.fitBounds(initialBounds.value, { padding: 60 })
    syncView()
  })
  map.on('move', onMove)

  mapInstance.value = map
  overlayRef.value = overlay
}

onMounted(initMap)

onBeforeUnmount(() => {
  if (moveTimer) clearTimeout(moveTimer)
  mapInstance.value?.remove()
  mapInstance.value = null
  overlayRef.value = null
})
</script>

<template>
  <div class="relative h-full w-full">
    <BaseMap ref="baseMapRef" :layers="layers">
      <template #overlay>
        <MapFilterPanel v-model="filter" />
        <MapTooltip :hover="hover" />
        <MapDetailOverlay @close="ui.clearSelection()" />
      </template>
    </BaseMap>

    <LoadingScreen v-if="!data.loaded" />
  </div>
</template>
