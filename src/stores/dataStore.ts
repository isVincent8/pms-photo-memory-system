import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Album, GeoLocation, Person, Photo, Place, PmsIndex, SiteMeta, Stage } from '@/types'
import { loadIndex } from '@/api'

export const IMPORTED_KEY = 'pms.importedIndex'

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

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

  function persist() {
    if (!storageAvailable()) return
    const idx: PmsIndex = {
      version: 'edited',
      generatedAt: new Date().toISOString(),
      site: site.value ?? undefined,
      stages: stages.value,
      albums: albums.value,
      people: people.value,
      places: places.value,
      photos: photos.value,
    }
    safeSetItem(IMPORTED_KEY, JSON.stringify(idx))
    imported.value = true
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

  // —— 本地编辑变更（保存到 localStorage） ——

  function updatePhoto(id: string, patch: Partial<Photo>) {
    const idx = photos.value.findIndex((p) => p.id === id)
    if (idx === -1) return
    photos.value[idx] = { ...photos.value[idx], ...patch }
    persist()
  }

  function updateStage(id: string, patch: Partial<Stage>) {
    const idx = stages.value.findIndex((s) => s.id === id)
    if (idx === -1) return
    stages.value[idx] = { ...stages.value[idx], ...patch }
    persist()
  }

  function createAlbum(input: Omit<Album, 'id'>): Album {
    const album: Album = { ...input, id: generateId('album') }
    albums.value.push(album)
    // 同步更新照片的 albumId
    album.photoIds?.forEach((pid) => {
      const p = photos.value.find((ph) => ph.id === pid)
      if (p) p.albumId = album.id
    })
    // 若属于某阶段，追加到阶段 albumIds
    if (album.stageId) {
      const s = stages.value.find((st) => st.id === album.stageId)
      if (s && !s.albumIds?.includes(album.id)) {
        s.albumIds = [...(s.albumIds ?? []), album.id]
      }
    }
    persist()
    return album
  }

  function updateAlbum(id: string, patch: Partial<Album>) {
    const idx = albums.value.findIndex((a) => a.id === id)
    if (idx === -1) return
    const prev = albums.value[idx]
    albums.value[idx] = { ...prev, ...patch }

    // 如果 photoIds 变化，同步更新照片归属
    if (patch.photoIds) {
      photos.value.forEach((p) => {
        if (p.albumId === id && !patch.photoIds!.includes(p.id)) {
          p.albumId = undefined
        }
      })
      patch.photoIds.forEach((pid) => {
        const p = photos.value.find((ph) => ph.id === pid)
        if (p) p.albumId = id
      })
    }

    // 如果 stageId 变化，同步阶段 albumIds
    if (patch.stageId !== undefined && patch.stageId !== prev.stageId) {
      if (prev.stageId) {
        const prevStage = stages.value.find((s) => s.id === prev.stageId)
        if (prevStage) {
          prevStage.albumIds = (prevStage.albumIds ?? []).filter((aid) => aid !== id)
        }
      }
      if (patch.stageId) {
        const nextStage = stages.value.find((s) => s.id === patch.stageId)
        if (nextStage && !nextStage.albumIds?.includes(id)) {
          nextStage.albumIds = [...(nextStage.albumIds ?? []), id]
        }
      }
    }

    persist()
  }

  function deleteAlbum(id: string) {
    const album = albums.value.find((a) => a.id === id)
    if (!album) return
    if (album.stageId) {
      const stage = stages.value.find((s) => s.id === album.stageId)
      if (stage) {
        stage.albumIds = (stage.albumIds ?? []).filter((aid) => aid !== id)
      }
    }
    photos.value.forEach((p) => {
      if (p.albumId === id) p.albumId = undefined
    })
    albums.value = albums.value.filter((a) => a.id !== id)
    persist()
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
    updatePhoto,
    updateStage,
    createAlbum,
    updateAlbum,
    deleteAlbum,
  }
})
