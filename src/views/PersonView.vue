<script setup lang="ts">
/**
 * PersonView —— 人物视图
 *
 * 展示人物档案（Markdown）、参与的阶段、关联照片时间线。照片点击打开 Lightbox。
 */
import { computed, onMounted } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import { useMarkdownContent } from '@/composables/useMarkdownContent'
import type { Photo, Stage } from '@/types'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

function fmt(input?: string | null, opts: Intl.DateTimeFormatOptions = {}) {
  if (!input) return ''
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input
  return new Intl.DateTimeFormat('zh-CN', opts).format(d)
}

const props = defineProps<{ id: string }>()
const data = useDataStore()
const ui = useUiStore()

onMounted(() => {
  if (!data.loaded) data.load()
})

const person = computed(() => data.people.find((p) => p.id === props.id))
const { markdown: personMarkdown } = useMarkdownContent(computed(() => person.value?.content))

const photos = computed<Photo[]>(() =>
  data.photos
    .filter((p) => p.people?.includes(props.id))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')),
)

const relatedStages = computed<Stage[]>(() =>
  (person.value?.stageIds ?? [])
    .map((id) => data.getStage(id))
    .filter((s): s is Stage => Boolean(s)),
)

</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-14">
    <!-- 加载骨架 -->
    <div v-if="!data.loaded" class="space-y-4">
      <div class="h-20 w-20 animate-pulse rounded-full bg-secondary" />
      <div class="h-6 w-1/4 animate-pulse rounded bg-secondary" />
    </div>

    <template v-else-if="person">
      <header class="mb-10 flex items-center gap-5 animate-rise">
        <div
          v-if="person.avatar"
          class="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-border"
        >
          <img :src="person.avatar" :alt="person.name" class="h-full w-full object-cover" />
        </div>
        <div>
          <p class="text-xs font-medium tracking-[0.2em] text-primary uppercase">Person</p>
          <h1 class="mt-1 font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {{ person.name }}
          </h1>
          <p v-if="person.bio" class="mt-2 max-w-xl text-sm text-muted-foreground">{{ person.bio }}</p>
        </div>
      </header>

      <!-- Markdown 档案 -->
      <section v-if="personMarkdown" class="mb-12">
        <div class="mb-4 flex items-center gap-2 text-muted-foreground">
          <h2 class="font-display text-sm tracking-wide">人物档案</h2>
          <span class="h-px flex-1 bg-border" />
        </div>
        <div class="surface p-6">
          <MarkdownRenderer :content="personMarkdown" />
        </div>
      </section>

      <!-- 关联阶段 -->
      <section v-if="relatedStages.length > 0" class="mb-12">
        <h2 class="mb-4 font-display text-lg font-semibold text-foreground">参与的阶段</h2>
        <div class="flex flex-wrap gap-2">
          <router-link
            v-for="stage in relatedStages"
            :key="stage.id"
            :to="`/stage/${stage.id}`"
            class="rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {{ stage.name }}
          </router-link>
        </div>
      </section>

      <!-- 照片时间线 -->
      <section v-if="photos.length > 0">
        <div class="mb-5 flex items-center gap-3">
          <h2 class="font-display text-xl font-semibold text-foreground">照片时间线</h2>
          <span class="text-xs text-muted-foreground">{{ photos.length }} 张</span>
          <span class="h-px flex-1 bg-border" />
        </div>

        <div class="space-y-8">
          <div
            v-for="(photo, idx) in photos"
            :key="photo.id"
            class="group flex gap-4"
          >
            <div class="flex w-24 shrink-0 flex-col items-end gap-1 pt-1 text-right">
              <span class="text-xs font-medium text-foreground">
                {{ photo.date ? fmt(photo.date, { month: 'short', day: 'numeric' }) : '—' }}
              </span>
              <span class="text-[10px] text-muted-foreground">
                {{ photo.date ? fmt(photo.date, { year: 'numeric' }) : '' }}
              </span>
            </div>
            <div class="relative flex-1">
              <div class="absolute left-0 top-3 h-2 w-2 rounded-full bg-primary" />
              <div class="absolute bottom-0 left-[3px] top-5 w-px bg-border group-last:hidden" />
              <button
                type="button"
                class="ml-6 overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary"
                @click="ui.openLightbox(photos, idx)"
              >
                <img
                  v-if="photo.thumbnail || photo.src"
                  :src="photo.thumbnail || photo.src"
                  :alt="photo.caption || person.name"
                  class="max-h-64 w-auto object-cover"
                />
                <div v-else class="p-4 text-xs text-muted-foreground">无图片</div>
                <p v-if="photo.caption" class="px-3 py-2 text-left text-xs text-muted-foreground">
                  {{ photo.caption }}
                </p>
              </button>
            </div>
          </div>
        </div>
      </section>

      <p v-else class="py-12 text-center text-sm text-muted-foreground">暂无关联照片</p>
    </template>

    <!-- 未找到 -->
    <div v-else class="py-24 text-center">
      <p class="font-display text-sm text-muted-foreground">未找到该人物</p>
      <router-link
        to="/people"
        class="mt-4 inline-block text-xs font-medium text-primary transition-colors hover:text-primary/80"
      >
        ← 返回人物列表
      </router-link>
    </div>
  </div>
</template>
