<script setup lang="ts">
/**
 * SettingsView —— 用户设置页
 *
 * 提供主题切换、日期格式、默认视图、减少动画等配置，
 * 所有设置持久化到 localStorage（由 uiStore 负责）。
 */
import { ref, onMounted } from 'vue'
import { useUiStore, type DateFormat } from '@/stores/uiStore'
import { useDataStore } from '@/stores/dataStore'
import { exportIndexJson } from '@/utils/exportUtils'
import {
  Sun, Moon, Calendar, Layout, Monitor, RotateCcw, Images, Download, Upload, FileX,
  Cloud, CloudUpload, CloudDownload, LogOut, LogIn
} from 'lucide-vue-next'
import type { PmsIndex } from '@/types'
import type { ViewMode } from '@/types'
import type { PhotoViewMode } from '@/stores/uiStore'
import {
  checkAuthStatus,
  pullFromDriveAndApply,
  pushAllLocal,
  getLastSyncedAt,
  isValidIndex,
} from '@/lib/driveSync'

const ui = useUiStore()
const data = useDataStore()

const exportingJson = ref(false)
const importing = ref(false)
const importStatus = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

// Drive 同步状态
const driveEmail = ref<string | null>(null)
const driveLoading = ref(false)
const driveMessage = ref<string | null>(null)
const driveLastSynced = ref<string | null>(null)

onMounted(() => {
  driveLastSynced.value = getLastSyncedAt()
  checkAuthStatus().then((status) => {
    if (status.authenticated) {
      driveEmail.value = status.email || null
    }
  })
})

async function onExportIndexJson() {
  exportingJson.value = true
  try {
    await exportIndexJson()
  } catch (e) {
    alert(e instanceof Error ? e.message : '导出失败')
  } finally {
    exportingJson.value = false
  }
}

function onImportClick() {
  fileInput.value?.click()
}

function validateIndex(idx: unknown): idx is PmsIndex {
  return (
    typeof idx === 'object' &&
    idx !== null &&
    Array.isArray((idx as PmsIndex).photos) &&
    Array.isArray((idx as PmsIndex).stages)
  )
}

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  importing.value = true
  importStatus.value = null
  try {
    const text = await file.text()
    const idx = JSON.parse(text) as unknown
    if (!validateIndex(idx)) {
      throw new Error('文件格式不正确，缺少 stages 或 photos 字段')
    }
    data.importIndex(idx as PmsIndex)
    importStatus.value = `导入成功：${(idx as PmsIndex).photos.length} 张照片，${(idx as PmsIndex).stages.length} 个阶段`
  } catch (err) {
    importStatus.value = `导入失败：${err instanceof Error ? err.message : String(err)}`
  } finally {
    importing.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const themeOptions: { key: 'dark' | 'light'; label: string; icon: typeof Sun }[] = [
  { key: 'dark', label: '深色', icon: Moon },
  { key: 'light', label: '浅色', icon: Sun },
]

const dateFormatOptions: { key: DateFormat; label: string }[] = [
  { key: 'long', label: '2020年6月15日' },
  { key: 'numeric', label: '2020-06-15' },
  { key: 'iso', label: '2020-06-15T00:00:00' },
]

const viewOptions: { key: ViewMode; label: string }[] = [
  { key: 'timeline', label: '时间轴' },
  { key: 'grid', label: '网格' },
  { key: 'masonry', label: '瀑布流' },
  { key: 'map', label: '地图' },
]

const photoViewOptions: { key: PhotoViewMode; label: string }[] = [
  { key: 'grid', label: '网格' },
  { key: 'masonry', label: '瀑布流' },
]

function onReset() {
  ui.resetSettings()
}

// —— Google Drive 同步 ——

function driveLoginUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL || ""
  return `${apiBase}/api/auth/login`
}

function driveLogoutUrl(): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL || ""
  return `${apiBase}/api/auth/logout`
}

async function onPushToDrive() {
  driveLoading.value = true
  driveMessage.value = null
  try {
    const result = await pushAllLocal()
    if (result.success) {
      driveMessage.value = "已推送当前数据到 Google Drive"
      driveLastSynced.value = result.syncedAt || getLastSyncedAt()
    } else {
      driveMessage.value = result.error || "推送失败"
    }
  } catch (e) {
    driveMessage.value = e instanceof Error ? e.message : String(e)
  } finally {
    driveLoading.value = false
  }
}

async function onPullFromDrive() {
  driveLoading.value = true
  driveMessage.value = null
  try {
    const result = await pullFromDriveAndApply()
    if (result.success) {
      const idxRaw = localStorage.getItem('pms.importedIndex')
      if (idxRaw) {
        const idx = JSON.parse(idxRaw) as PmsIndex
        if (isValidIndex(idx)) {
          data.applyImportedIndex(idx)
        }
      }
      driveMessage.value = result.driveEmpty
        ? "Google Drive 上暂无数据"
        : "已从 Google Drive 拉取数据"
      driveLastSynced.value = result.syncedAt || getLastSyncedAt()
    } else {
      driveMessage.value = result.error || "拉取失败"
    }
  } catch (e) {
    driveMessage.value = e instanceof Error ? e.message : String(e)
  } finally {
    driveLoading.value = false
  }
}
</script>

<template>
  <div class="page-container py-10 md:py-14">
    <header class="mb-10 animate-rise">
      <p class="font-display text-xs tracking-[0.3em] text-primary uppercase">Settings</p>
      <h1 class="section-title mt-2">设置</h1>
      <p class="mt-2 text-sm text-muted-foreground">自定义你的时光纪浏览体验</p>
    </header>

    <section class="surface mb-6 p-5">
      <div class="mb-4 flex items-center gap-2 text-foreground">
        <Monitor :size="16" />
        <h2 class="font-display text-sm tracking-wide">外观</h2>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="opt in themeOptions"
          :key="opt.key"
          type="button"
          class="flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors"
          :class="
            ui.settings.theme === opt.key
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-foreground hover:border-primary/60'
          "
          @click="ui.updateSettings({ theme: opt.key })"
        >
          <component :is="opt.icon" :size="16" />
          {{ opt.label }}
        </button>
      </div>

      <label class="mt-4 flex cursor-pointer items-center justify-between border-t border-border pt-4">
        <span class="text-sm text-muted-foreground">减少动画效果</span>
        <input
          v-model="ui.settings.reduceMotion"
          type="checkbox"
          class="h-4 w-4 accent-primary"
        />
      </label>
    </section>

    <section class="surface mb-6 p-5">
      <div class="mb-4 flex items-center gap-2 text-foreground">
        <Calendar :size="16" />
        <h2 class="font-display text-sm tracking-wide">日期格式</h2>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in dateFormatOptions"
          :key="opt.key"
          type="button"
          class="rounded-lg border px-3 py-1.5 text-xs transition-colors"
          :class="
            ui.settings.dateFormat === opt.key
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground'
          "
          @click="ui.updateSettings({ dateFormat: opt.key })"
        >
          {{ opt.label }}
        </button>
      </div>
    </section>

    <section class="surface mb-6 p-5">
      <div class="mb-4 flex items-center gap-2 text-foreground">
        <Layout :size="16" />
        <h2 class="font-display text-sm tracking-wide">默认视图</h2>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in viewOptions"
          :key="opt.key"
          type="button"
          class="rounded-lg border px-3 py-1.5 text-xs transition-colors"
          :class="
            ui.settings.defaultView === opt.key
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground'
          "
          @click="ui.updateSettings({ defaultView: opt.key })"
        >
          {{ opt.label }}
        </button>
      </div>
    </section>

    <section class="surface mb-6 p-5">
      <div class="mb-4 flex items-center gap-2 text-foreground">
        <Images :size="16" />
        <h2 class="font-display text-sm tracking-wide">照片默认布局</h2>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="opt in photoViewOptions"
          :key="opt.key"
          type="button"
          class="rounded-lg border px-3 py-1.5 text-xs transition-colors"
          :class="
            ui.settings.photoViewMode === opt.key
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground hover:border-primary/60 hover:text-foreground'
          "
          @click="ui.updateSettings({ photoViewMode: opt.key })"
        >
          {{ opt.label }}
        </button>
      </div>
    </section>

    <section class="surface mb-6 p-5">
      <div class="mb-4 flex items-center gap-2 text-foreground">
        <Download :size="16" />
        <h2 class="font-display text-sm tracking-wide">数据导出</h2>
      </div>
      <div class="space-y-2 text-sm text-muted-foreground">
        <p>阶段数量：{{ data.stages.length }}</p>
        <p>相册数量：{{ data.albums.length }}</p>
        <p>照片数量：{{ data.photos.length }}</p>
        <p>人物数量：{{ data.people.length }}</p>
        <p>地点数量：{{ data.places.length }}</p>
      </div>
      <button
        type="button"
        class="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        :disabled="exportingJson"
        @click="onExportIndexJson"
      >
        <Download :size="14" />
        {{ exportingJson ? '导出中…' : '导出 index.json' }}
      </button>
    </section>

    <section class="surface mb-6 p-5">
      <div class="mb-4 flex items-center gap-2 text-foreground">
        <Upload :size="16" />
        <h2 class="font-display text-sm tracking-wide">数据导入</h2>
      </div>
      <p class="text-sm text-muted-foreground">
        上传 index.json 覆盖当前本地数据。导入后仅保存在本浏览器，刷新页面仍生效。
      </p>
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        class="hidden"
        @change="onFileChange"
      />
      <button
        type="button"
        class="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
        :disabled="importing"
        @click="onImportClick"
      >
        <Upload :size="14" />
        {{ importing ? '导入中…' : '导入 index.json' }}
      </button>
      <button
        v-if="data.imported"
        type="button"
        class="ml-3 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs text-destructive transition-colors hover:border-destructive"
        @click="data.clearImported"
      >
        <FileX :size="14" />
        恢复默认数据
      </button>
      <p
        v-if="importStatus"
        class="mt-3 text-xs"
        :class="importStatus.startsWith('导入成功') ? 'text-green-600' : 'text-destructive'"
      >
        {{ importStatus }}
      </p>
    </section>

    <section class="surface mb-6 p-5">
      <div class="mb-4 flex items-center gap-2 text-foreground">
        <Cloud :size="16" />
        <h2 class="font-display text-sm tracking-wide">Google Drive 同步</h2>
      </div>

      <div v-if="driveEmail" class="space-y-4">
        <p class="text-sm text-muted-foreground">
          已登录：{{ driveEmail }}
        </p>
        <div class="flex flex-wrap gap-3">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            :disabled="driveLoading"
            @click="onPushToDrive"
          >
            <CloudUpload :size="14" />
            {{ driveLoading ? '同步中…' : '推送到 Drive' }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
            :disabled="driveLoading"
            @click="onPullFromDrive"
          >
            <CloudDownload :size="14" />
            {{ driveLoading ? '同步中…' : '从 Drive 拉取' }}
          </button>
          <a
            :href="driveLogoutUrl()"
            class="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs text-destructive transition-colors hover:border-destructive"
          >
            <LogOut :size="14" />
            退出登录
          </a>
        </div>
        <p v-if="driveLastSynced" class="text-xs text-muted-foreground">
          上次同步：{{ new Date(driveLastSynced).toLocaleString() }}
        </p>
      </div>

      <div v-else class="space-y-4">
        <p class="text-sm text-muted-foreground">
          登录 Google 账号后，可将当前数据同步到你的 Google Drive。
        </p>
        <a
          :href="driveLoginUrl()"
          class="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <LogIn :size="14" />
          使用 Google 登录
        </a>
      </div>

      <p
        v-if="driveMessage"
        class="mt-3 text-xs"
        :class="driveMessage.includes('失败') || driveMessage.includes('暂无') ? 'text-destructive' : 'text-green-600'"
      >
        {{ driveMessage }}
      </p>
    </section>

    <button
      type="button"
      class="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
      @click="onReset"
    >
      <RotateCcw :size="14" />
      恢复默认设置
    </button>
  </div>
</template>
