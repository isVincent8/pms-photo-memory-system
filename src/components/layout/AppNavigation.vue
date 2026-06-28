<script setup lang="ts">
/**
 * AppNavigation —— 顶部导航条
 *
 * 毛玻璃背景 + 居中 Logo + pill 形主视图切换入口。
 */
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { Clock, Map, Users, MapPin, Images, Search, Settings, Sun, Moon, PanelLeft } from 'lucide-vue-next'
import { useUiStore } from '@/stores/uiStore'

const ui = useUiStore()
const route = useRoute()

const navItems = computed(() => [
  { to: '/timeline', label: '时间轴', icon: Clock },
  { to: '/albums', label: '相册', icon: Images },
  { to: '/map', label: '地图', icon: Map },
  { to: '/people', label: '人物', icon: Users },
  { to: '/places', label: '地点', icon: MapPin },
])

const siteTitle = '时光纪'
</script>

<template>
  <header
    class="fixed top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/50 bg-background/70 px-4 backdrop-blur-xl md:px-6"
  >
    <div class="flex items-center gap-3">
      <button
        v-if="route.name !== 'timeline'"
        type="button"
        class="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
        aria-label="切换侧边栏"
        @click="ui.toggleSidebar()"
      >
        <PanelLeft :size="18" />
      </button>

      <router-link to="/timeline" class="flex items-center gap-2.5">
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          时
        </span>
        <span class="font-display text-lg font-semibold tracking-tight text-foreground">
          {{ siteTitle }}
        </span>
      </router-link>
    </div>

    <nav class="flex items-center gap-1 rounded-full border border-border/60 bg-secondary/60 p-1 backdrop-blur-sm">
      <router-link
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="nav-pill"
        :class="route.path.startsWith(item.to) ? 'nav-pill-active' : 'nav-pill-inactive'"
        :aria-current="route.path.startsWith(item.to) ? 'page' : undefined"
      >
        <component :is="item.icon" :size="15" aria-hidden="true" />
        <span>{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="flex items-center gap-1">
      <router-link
        to="/search"
        class="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        :class="route.name === 'search' ? 'text-primary' : ''"
        aria-label="搜索"
      >
        <Search :size="18" />
      </router-link>

      <button
        type="button"
        class="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        aria-label="切换深色模式"
        @click="ui.toggleTheme()"
      >
        <Moon v-if="ui.settings.theme === 'dark'" :size="18" />
        <Sun v-else :size="18" />
      </button>

      <router-link
        to="/settings"
        class="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        :class="route.name === 'settings' ? 'text-primary' : ''"
        aria-label="设置"
      >
        <Settings :size="18" />
      </router-link>
    </div>
  </header>
</template>
