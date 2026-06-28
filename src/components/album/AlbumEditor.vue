<script setup lang="ts">
/**
 * AlbumEditor —— 创建 / 编辑故事（相册）
 *
 * 把选中的多张照片组成一个故事，可以写长文、设置标题和日期。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import type { Album, Photo } from '@/types'
import LazyImage from '@/components/LazyImage.vue'
import { X, Calendar, AlignLeft, Type, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  /** 若提供则进入编辑模式 */
  albumId?: string
  /** 创建模式下的初始照片 */
  initialPhotoIds?: string[]
  /** 创建模式下的默认阶段 */
  initialStageId?: string
}>()

const emit = defineEmits<{
  close: []
  saved: [albumId: string]
  deleted: [albumId: string]
}>()

const data = useDataStore()

const title = ref('')
const date = ref('')
const endDate = ref('')
const content = ref('')
const selectedPhotoIds = ref<string[]>([])
const stageId = ref<string | undefined>(undefined)
const type = ref<Album['type']>('story')

const isEdit = computed(() => Boolean(props.albumId))
const existingAlbum = computed(() => (props.albumId ? data.getAlbum(props.albumId) : undefined))

const availablePhotos = computed<Photo[]>(() => {
  // 编辑模式：显示当前相册的照片 + 同阶段未分配相册的照片
  // 创建模式：显示初始阶段的照片，或全部照片
  const ids = new Set(selectedPhotoIds.value)
  let pool = data.photos.filter((p) => {
    if (ids.has(p.id)) return true
    if (p.albumId && p.albumId !== props.albumId) return false
    return true
  })
  if (stageId.value) {
    pool = pool.filter((p) => p.stageId === stageId.value || ids.has(p.id))
  }
  return pool.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
})

function init() {
  if (existingAlbum.value) {
    const a = existingAlbum.value
    title.value = a.title
    date.value = a.date
    endDate.value = a.endDate ?? ''
    content.value = a.content ?? ''
    selectedPhotoIds.value = a.photoIds ?? []
    stageId.value = a.stageId
    type.value = a.type ?? 'story'
  } else {
    title.value = ''
    date.value = new Date().toISOString().slice(0, 10)
    endDate.value = ''
    content.value = ''
    selectedPhotoIds.value = props.initialPhotoIds ?? []
    stageId.value = props.initialStageId
    type.value = 'story'
  }
}

onMounted(init)
watch(() => props.albumId, init)

function togglePhoto(id: string) {
  const set = new Set(selectedPhotoIds.value)
  if (set.has(id)) set.delete(id)
  else set.add(id)
  selectedPhotoIds.value = Array.from(set)
}

function movePhoto(id: string, direction: -1 | 1) {
  const idx = selectedPhotoIds.value.indexOf(id)
  if (idx === -1) return
  const next = idx + direction
  if (next < 0 || next >= selectedPhotoIds.value.length) return
  const arr = [...selectedPhotoIds.value]
  ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
  selectedPhotoIds.value = arr
}

const canSave = computed(() => title.value.trim() && selectedPhotoIds.value.length > 0)

function onSave() {
  if (!canSave.value) return
  const payload = {
    title: title.value.trim(),
    date: date.value,
    endDate: endDate.value || undefined,
    content: content.value.trim(),
    photoIds: selectedPhotoIds.value,
    stageId: stageId.value,
    cover: data.getPhoto(selectedPhotoIds.value[0])?.src,
    type: type.value,
  }
  if (existingAlbum.value) {
    data.updateAlbum(existingAlbum.value.id, payload)
    emit('saved', existingAlbum.value.id)
  } else {
    const album = data.createAlbum(payload as Omit<Album, 'id'>)
    emit('saved', album.id)
  }
}

function onDelete() {
  if (!existingAlbum.value) return
  if (!confirm('确定要删除这个故事吗？照片不会被删除。')) return
  data.deleteAlbum(existingAlbum.value.id)
  emit('deleted', existingAlbum.value.id)
}

const selectedPhotos = computed(() =>
  selectedPhotoIds.value
    .map((id) => data.getPhoto(id))
    .filter((p): p is Photo => Boolean(p)),
)
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm">
    <div class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl">
      <!-- 头部 -->
      <div class="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 class="font-display text-lg font-semibold text-foreground">
          {{ isEdit ? '编辑故事' : '新建故事' }}
        </h2>
        <button
          type="button"
          class="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          @click="$emit('close')"
        >
          <X :size="18" />
        </button>
      </div>

      <!-- 表单 -->
      <div class="flex-1 overflow-y-auto px-6 py-5">
        <div class="grid gap-5 md:grid-cols-3">
          <div class="space-y-4 md:col-span-1">
            <div>
              <label class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Type :size="12" /> 标题
              </label>
              <input
                v-model="title"
                type="text"
                class="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                placeholder="故事标题"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar :size="12" /> 开始日期
                </label>
                <input
                  v-model="date"
                  type="date"
                  class="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label class="mb-1.5 text-xs font-medium text-muted-foreground">结束日期（可选）</label>
                <input
                  v-model="endDate"
                  type="date"
                  class="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label class="mb-1.5 text-xs font-medium text-muted-foreground">所属阶段（可选）</label>
              <select
                v-model="stageId"
                class="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option :value="undefined">不关联阶段</option>
                <option v-for="s in data.stages" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>

            <div>
              <label class="mb-1.5 text-xs font-medium text-muted-foreground">类型</label>
              <select
                v-model="type"
                class="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="story">故事</option>
                <option value="event">事件集</option>
              </select>
            </div>
          </div>

          <div class="md:col-span-2">
            <label class="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <AlignLeft :size="12" /> 故事正文
            </label>
            <textarea
              v-model="content"
              rows="10"
              class="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm leading-relaxed text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="写下这些照片背后的故事..."
            />
          </div>
        </div>

        <!-- 已选照片 -->
        <div class="mt-6">
          <h3 class="mb-3 text-xs font-medium text-muted-foreground">
            已选照片 {{ selectedPhotoIds.length }} 张
          </h3>
          <div v-if="selectedPhotos.length === 0" class="text-xs text-muted-foreground">
            还没有选择照片，请从下方选择。
          </div>
          <div v-else class="flex flex-wrap gap-3">
            <div
              v-for="(p, idx) in selectedPhotos"
              :key="p.id"
              class="group relative w-24 shrink-0 overflow-hidden rounded-xl"
            >
              <LazyImage :src="p.thumbnail || p.src" :alt="p.caption ?? ''" :aspect-ratio="1" />
              <div class="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/50 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  :disabled="idx === 0"
                  class="rounded p-0.5 text-white disabled:opacity-30 hover:bg-white/20"
                  @click="movePhoto(p.id, -1)"
                >
                  ←
                </button>
                <button
                  type="button"
                  class="rounded p-0.5 text-white hover:bg-white/20"
                  @click="togglePhoto(p.id)"
                >
                  ×
                </button>
                <button
                  type="button"
                  :disabled="idx === selectedPhotos.length - 1"
                  class="rounded p-0.5 text-white disabled:opacity-30 hover:bg-white/20"
                  @click="movePhoto(p.id, 1)"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 照片池 -->
        <div class="mt-6">
          <h3 class="mb-3 text-xs font-medium text-muted-foreground">可选照片</h3>
          <div v-if="availablePhotos.length === 0" class="text-xs text-muted-foreground">
            当前阶段下没有更多可用照片。
          </div>
          <div v-else class="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
            <button
              v-for="p in availablePhotos"
              :key="p.id"
              type="button"
              class="relative overflow-hidden rounded-xl ring-primary transition-all hover:ring-2"
              :class="selectedPhotoIds.includes(p.id) ? 'ring-2 opacity-60' : ''"
              @click="togglePhoto(p.id)"
            >
              <LazyImage :src="p.thumbnail || p.src" :alt="p.caption ?? ''" :aspect-ratio="1" />
              <div
                v-if="selectedPhotoIds.includes(p.id)"
                class="absolute inset-0 flex items-center justify-center text-lg font-bold text-primary"
              >
                ✓
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="flex items-center justify-between border-t border-border px-6 py-4">
        <button
          v-if="isEdit"
          type="button"
          class="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
          @click="onDelete"
        >
          <Trash2 :size="14" /> 删除
        </button>
        <span v-else />
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            @click="$emit('close')"
          >
            取消
          </button>
          <button
            type="button"
            :disabled="!canSave"
            class="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="onSave"
          >
            {{ isEdit ? '保存' : '创建故事' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
