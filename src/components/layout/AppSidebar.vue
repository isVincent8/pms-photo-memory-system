<script setup lang="ts">
/**
 * AppSidebar —— 阶段导航侧边栏
 *
 * 列出所有人生阶段，点击进入对应阶段详情。
 * 桌面端常驻；移动端由 uiStore.sidebarOpen 控制滑出。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import { formatDateRange } from '@/utils/dateUtils'
import type { Stage } from '@/types'

const data = useDataStore()
const ui = useUiStore()
const route = useRoute()

const sortedStages = computed<Stage[]>(() =>
  [...data.stages].sort((a, b) => a.startDate.localeCompare(b.startDate)),
)

function isActive(id: string): boolean {
  return route.name === 'stage' && route.params.id === id
}

function onNavigate() {
  if (window.innerWidth < 768) ui.setSidebar(false)
}
</script>

<template>
  <!-- 移动端遮罩 -->
  <Transition name="overlay">
    <div
      v-if="ui.sidebarOpen"
      class="fixed inset-0 z-30 bg-foreground/10 backdrop-blur-sm md:hidden"
      @click="ui.setSidebar(false)"
    />
  </Transition>

  <aside
    class="fixed inset-y-0 left-0 z-40 flex h-full w-64 shrink-0 flex-col border-r border-border bg-background transition-transform duration-300 md:relative md:translate-x-0"
    :class="ui.sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="px-5 pb-3 pt-8">
      <p class="text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
        Life Stages
      </p>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 pb-6">
      <router-link
        v-for="stage in sortedStages"
        :key="stage.id"
        :to="`/stage/${stage.id}`"
        class="group relative flex flex-col gap-1 rounded-xl border border-transparent px-4 py-3 transition-all duration-200"
        :class="
          isActive(stage.id)
            ? 'bg-secondary text-foreground'
            : 'hover:border-border hover:bg-secondary/50'
        "
        @click="onNavigate"
      >
        <p class="text-sm font-medium text-foreground">
          {{ stage.name }}
        </p>
        <p class="text-xs text-muted-foreground">
          {{ formatDateRange(stage.startDate, stage.endDate) }}
        </p>
        <span
          v-if="stage.themeColor"
          class="mt-1 block h-1 w-8 rounded-full opacity-60"
          :style="{ backgroundColor: stage.themeColor }"
        />
      </router-link>
    </nav>
  </aside>
</template>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.3s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
</style>
