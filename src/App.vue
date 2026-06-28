<script setup lang="ts">
/**
 * App —— 应用根组件
 *
 * 启动时通过 dataStore.load() 拉取 index.json；首次加载期间展示 LoadingScreen。
 * 布局：顶部 Navigation + 右侧主内容区（router-view）。
 *      Timeline 视图自带阶段列表，不显示全局侧边栏。
 */
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import AppNavigation from '@/components/layout/AppNavigation.vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import LoadingScreen from '@/components/LoadingScreen.vue'
import Lightbox from '@/components/album/Lightbox.vue'
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp.vue'
import PwaInstallPrompt from '@/components/PwaInstallPrompt.vue'
import NetworkStatus from '@/components/NetworkStatus.vue'
import BackToTop from '@/components/BackToTop.vue'

const data = useDataStore()
const ui = useUiStore()
const route = useRoute()

onMounted(() => {
  if (window.innerWidth < 768) ui.setSidebar(false)
  if (!data.loaded) data.load()
})

const showLoading = computed(() => !data.loaded && !data.error)
// Timeline 视图自带阶段列表，隐藏全局侧栏以避免重复
const showSidebar = computed(() => route.name !== 'timeline')
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background">
    <a
      href="#main-content"
      class="sr-only left-2 top-20 z-50 rounded-lg bg-primary px-4 py-2 text-xs text-primary-foreground focus:not-sr-only focus:fixed focus:outline-none focus:ring-2 focus:ring-ring"
    >
      跳转到主要内容
    </a>

    <AppNavigation />

    <div class="flex flex-1 overflow-hidden pt-16">
      <AppSidebar v-if="showSidebar" />
      <main id="main-content" class="flex-1 overflow-y-auto" tabindex="-1">
        <router-view v-slot="{ Component }">
          <Transition name="view" mode="out-in">
            <component :is="Component" />
          </Transition>
        </router-view>
      </main>
    </div>

    <!-- 首次加载遮罩 -->
    <LoadingScreen v-if="showLoading" aria-live="polite" />

    <!-- 加载失败提示 -->
    <div
      v-else-if="!data.loaded && data.error"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 text-center"
      aria-live="assertive"
      role="alert"
    >
      <p class="font-display text-sm tracking-[0.3em] text-destructive uppercase">加载失败</p>
      <p class="mt-3 max-w-md text-sm text-muted-foreground">{{ data.error }}</p>
      <button
        type="button"
        class="mt-6 rounded-lg border border-border bg-card px-4 py-2 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
        @click="data.load()"
      >
        重新加载
      </button>
    </div>

    <!-- 全局灯箱（由 uiStore.lightbox 驱动） -->
    <Lightbox />

    <!-- 快捷键帮助面板 -->
    <KeyboardShortcutsHelp />

    <!-- PWA 安装提示 -->
    <PwaInstallPrompt />

    <!-- 网络状态提示 -->
    <NetworkStatus />

    <!-- 回到顶部 -->
    <BackToTop />
  </div>
</template>

<style scoped>
.view-enter-active,
.view-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.view-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.view-leave-to {
  opacity: 0;
}
</style>
