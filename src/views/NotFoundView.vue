<script setup lang="ts">
/**
 * NotFoundView —— 404 页面
 */
import { Home, ArrowLeft } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center px-6 text-center">
    <p class="font-display text-6xl font-semibold tracking-tighter text-primary">404</p>
    <h1 class="mt-4 font-display text-xl text-foreground">页面不存在</h1>
    <p class="mt-2 max-w-xs text-sm text-muted-foreground">你寻找的回忆似乎还没有被记录到这里。</p>

    <div class="mt-8 flex items-center gap-3">
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-xs text-foreground transition-colors hover:border-primary hover:text-primary"
        @click="router.back()"
      >
        <ArrowLeft :size="14" />
        返回上一页
      </button>
      <router-link
        to="/timeline"
        class="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-xs text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Home :size="14" />
        回到首页
      </router-link>
    </div>
  </div>
</template>
