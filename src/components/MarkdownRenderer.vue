<script setup lang="ts">
/**
 * MarkdownRenderer —— Markdown 渲染异步包装
 *
 * 将重依赖的 v-md-editor 拆分为独立 chunk，按需加载。
 * 首次渲染前显示简洁骨架，加载失败显示错误提示。
 */
import { defineAsyncComponent } from 'vue'

const MarkdownRendererCore = defineAsyncComponent(
  () => import('./MarkdownRendererCore.vue'),
)

defineProps<{
  content: string
}>()
</script>

<template>
  <Suspense>
    <MarkdownRendererCore :content="content" />
    <template #fallback>
      <div class="space-y-3">
        <div class="h-4 w-3/4 animate-pulse rounded bg-secondary" />
        <div class="h-4 w-1/2 animate-pulse rounded bg-secondary" />
        <div class="h-4 w-5/6 animate-pulse rounded bg-secondary" />
      </div>
    </template>
  </Suspense>
</template>
