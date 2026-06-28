/**
 * uiStore — 界面状态
 *
 * 维护侧边栏、当前选中阶段 / 相册、视图与排序方式、加载态、灯箱，
 * 地图视图需要的照片 / 地点选中状态，以及用户设置（主题、日期格式等）。
 */
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Photo, ViewMode } from '@/types'

/** 排序方式：chronological 按时间，alphabetical 按名称 */
export type SortOrder = 'chronological' | 'alphabetical'

/** 日期格式 */
export type DateFormat = 'long' | 'numeric' | 'iso'

/** 照片列表布局模式 */
export type PhotoViewMode = 'grid' | 'masonry'

/** 灯箱状态 */
export interface LightboxState {
  open: boolean
  photos: Photo[]
  index: number
}

/** 用户设置 */
export interface AppSettings {
  theme: 'dark' | 'light'
  dateFormat: DateFormat
  defaultView: ViewMode
  photoViewMode: PhotoViewMode
  reduceMotion: boolean
}

const SETTINGS_KEY = 'pms:settings'

const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') {
    return { theme: 'light', dateFormat: 'long', defaultView: 'timeline', photoViewMode: 'masonry', reduceMotion: false }
  }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        theme: parsed.theme === 'dark' ? 'dark' : 'light',
        dateFormat: ['long', 'numeric', 'iso'].includes(parsed.dateFormat) ? parsed.dateFormat : 'long',
        defaultView: ['timeline', 'grid', 'masonry', 'slideshow', 'map', 'people'].includes(parsed.defaultView)
          ? parsed.defaultView
          : 'timeline',
        photoViewMode: ['grid', 'masonry'].includes(parsed.photoViewMode) ? parsed.photoViewMode : 'masonry',
        reduceMotion: !!parsed.reduceMotion,
      }
    }
  } catch {
    // ignore parse errors
  }
  return { theme: 'light', dateFormat: 'long', defaultView: 'timeline', photoViewMode: 'masonry', reduceMotion: false }
}

function applyTheme(theme: 'dark' | 'light') {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(isDesktop)
  const currentStageId = ref<string | null>(null)
  const currentAlbumId = ref<string | null>(null)
  const viewMode = ref<ViewMode>('timeline')
  const sortOrder = ref<SortOrder>('chronological')
  const globalLoading = ref(false)

  const settings = ref<AppSettings>(loadSettings())
  const isDark = computed(() => settings.value.theme === 'dark')

  // 初始化时应用主题与动画偏好
  applyTheme(settings.value.theme)
  if (typeof window !== 'undefined') {
    document.documentElement.classList.toggle('reduce-motion', settings.value.reduceMotion)
  }

  const lightbox = ref<LightboxState>({ open: false, photos: [], index: 0 })
  const shortcutsHelpOpen = ref(false)

  // 地图视图选择状态
  const selectedPhotoId = ref<string | null>(null)
  const selectedPlaceId = ref<string | null>(null)

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }
  function setSidebar(open: boolean) {
    sidebarOpen.value = open
  }
  function setSortOrder(order: SortOrder) {
    sortOrder.value = order
  }
  function setViewMode(mode: ViewMode) {
    viewMode.value = mode
  }

  function openLightbox(photos: Photo[], index = 0) {
    lightbox.value = { open: true, photos, index }
  }
  function closeLightbox() {
    lightbox.value = { ...lightbox.value, open: false }
  }
  function lightboxNext() {
    if (!lightbox.value.open) return
    const len = lightbox.value.photos.length
    lightbox.value = { ...lightbox.value, index: (lightbox.value.index + 1) % len }
  }
  function lightboxPrev() {
    if (!lightbox.value.open) return
    const len = lightbox.value.photos.length
    lightbox.value = { ...lightbox.value, index: (lightbox.value.index - 1 + len) % len }
  }
  function lightboxGoto(index: number) {
    if (!lightbox.value.open) return
    const len = lightbox.value.photos.length
    lightbox.value = { ...lightbox.value, index: ((index % len) + len) % len }
  }

  function openShortcutsHelp() {
    shortcutsHelpOpen.value = true
  }
  function closeShortcutsHelp() {
    shortcutsHelpOpen.value = false
  }
  function toggleShortcutsHelp() {
    shortcutsHelpOpen.value = !shortcutsHelpOpen.value
  }

  function selectPhoto(id: string | null) {
    selectedPhotoId.value = id
    selectedPlaceId.value = null
  }
  function selectPlace(id: string | null) {
    selectedPlaceId.value = id
    selectedPhotoId.value = null
  }
  function clearSelection() {
    selectedPhotoId.value = null
    selectedPlaceId.value = null
  }

  // —— 设置 ——
  function updateSettings(patch: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...patch }
  }

  function resetSettings() {
    settings.value = { theme: getSystemTheme(), dateFormat: 'long', defaultView: 'timeline', photoViewMode: 'masonry', reduceMotion: false }
  }

  function toggleTheme() {
    settings.value.theme = settings.value.theme === 'dark' ? 'light' : 'dark'
  }

  // 持久化设置并同步主题与动画偏好到 html class
  watch(
    () => settings.value.theme,
    (theme) => applyTheme(theme),
  )

  watch(
    () => settings.value.reduceMotion,
    (reduce) => {
      if (typeof window === 'undefined') return
      document.documentElement.classList.toggle('reduce-motion', reduce)
    },
  )

  watch(
    settings,
    (s) => {
      if (typeof window === 'undefined') return
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
      } catch {
        // ignore storage errors
      }
    },
    { deep: true },
  )

  return {
    sidebarOpen,
    currentStageId,
    currentAlbumId,
    viewMode,
    sortOrder,
    globalLoading,
    lightbox,
    shortcutsHelpOpen,
    isDark,
    selectedPhotoId,
    selectedPlaceId,
    settings,
    toggleSidebar,
    setSidebar,
    setSortOrder,
    setViewMode,
    openLightbox,
    closeLightbox,
    lightboxNext,
    lightboxPrev,
    lightboxGoto,
    openShortcutsHelp,
    closeShortcutsHelp,
    toggleShortcutsHelp,
    selectPhoto,
    selectPlace,
    clearSelection,
    updateSettings,
    resetSettings,
    toggleTheme,
  }
})
