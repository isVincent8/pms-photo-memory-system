import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Album, GeoLocation, Person, Photo, Place, PmsIndex, SiteMeta, Stage } from '@/types'
import { loadIndex } from '@/api'

export const IMPORTED_KEY = 'pms.importedIndex'

function storageAvailable(): boolean {
  return typeof window !== 'undefined' && typeof localStorage?.getItem === 'function'
}

function safeGetItem(key: string): string | null {
  return storageAvailable() ? localStorage.getItem(key) : null
}

function safeSetItem(key: string, value: string): void {
  if (storageAvailable()) localStorage.setItem(key, value)
}

function safeRemoveItem(key: string): void {
  if (storageAvailable()) localStorage.removeItem(key)
}

export const useDataStore = defineStore('data', () => {
  const site = ref<SiteMeta | null>(null)
  const stages = ref<Stage[]>([])
  const albums = ref<Album[]>([])
  const people = ref<Person[]>([])
  const places = ref<Place[]>([])
  const photos = ref<Photo[]>([])
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const imported = ref(false)

  function applyIndex(idx: PmsIndex) {
    site.value = idx.site ?? null
    stages.value = idx.stages ?? []
    albums.value = idx.albums ?? []
    people.value = idx.people ?? []
    places.value = idx.places ?? []
    photos.value = idx.photos ?? []
    loaded.value = true
  }

  async function load() {
    if (loaded.value || loading.value) return
    loading.value = true
    error.value = null
    try {
      let idx: PmsIndex | null = null
      // 优先使用本地导入的数据；localStorage 不可用时回退到 fetch
      const raw = safeGetItem(IMPORTED_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as PmsIndex
        if (Array.isArray(parsed.photos) && Array.isArray(parsed.stages)) {
          idx = parsed
          imported.value = true
        }
      }
      if (!idx) {
        idx = await loadIndex()
      }
      applyIndex(idx)
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function importIndex(idx: PmsIndex) {
    safeSetItem(IMPORTED_KEY, JSON.stringify(idx))
    applyIndex(idx)
    imported.value = true
  }

  function clearImported() {
    safeRemoveItem(IMPORTED_KEY)
    imported.value = false
    loaded.value = false
    load()
  }

  /**
   * 从外部（如 Drive 同步）注入新的 index 数据。
   */
  function applyImportedIndex(idx: PmsIndex) {
    safeSetItem(IMPORTED_KEY, JSON.stringify(idx))
    applyIndex(idx)
    imported.value = true
  }

  // —— 派生集合 ——
  const allPhotos = computed(() => photos.value)
  const photosWithLocation = computed(() =>
    photos.value.filter((p): p is Photo & { location: GeoLocation } => !!p.location),
  )
  const placesWithLocation = computed(() =>
    places.value.filter((p): p is Place & { location: GeoLocation } => !!p.location),
  )

  // —— 按主键查询 ——
  function getStage(id: string | null | undefined): Stage | undefined {
    return id ? stages.value.find((s) => s.id === id) : undefined
  }
  function getAlbum(id: string | null | undefined): Album | undefined {
    return id ? albums.value.find((a) => a.id === id) : undefined
  }
  function getPerson(id: string | null | undefined): Person | undefined {
    return id ? people.value.find((p) => p.id === id) : undefined
  }
  function getPlace(id: string | null | undefined): Place | undefined {
    return id ? places.value.find((p) => p.id === id) : undefined
  }
  function getPhoto(id: string | null | undefined): Photo | undefined {
    return id ? photos.value.find((p) => p.id === id) : undefined
  }

  // —— 按关系查询照片 ——
  function photosOfStage(stageId: string): Photo[] {
    return photos.value.filter((p) => p.stageId === stageId)
  }
  function photosOfAlbum(albumId: string): Photo[] {
    return photos.value.filter((p) => p.albumId === albumId)
  }
  function photosOfPerson(personId: string): Photo[] {
    return photos.value.filter((p) => p.people?.includes(personId))
  }

  // 同一地点（按 location.name 匹配）下的照片
  function photosAtPlace(placeId: string): Photo[] {
    const place = getPlace(placeId)
    if (!place?.location?.name) return []
    return photos.value.filter((p) => p.location?.name === place.location?.name)
  }

  return {
    site,
    stages,
    albums,
    people,
    places,
    photos,
    loaded,
    loading,
    error,
    imported,
    load,
    importIndex,
    clearImported,
    applyImportedIndex,
    allPhotos,
    photosWithLocation,
    placesWithLocation,
    getStage,
    getAlbum,
    getPerson,
    getPlace,
    getPhoto,
    photosOfStage,
    photosOfAlbum,
    photosOfPerson,
    photosAtPlace,
  }
})
