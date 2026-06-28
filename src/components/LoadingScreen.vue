<script setup lang="ts">
/**
 * LoadingScreen —— 全屏加载动画
 *
 * 显示简洁的脉冲加载指示；超过 timeout（默认 8s）后展示「返回首页」入口，
 * 避免用户在数据加载异常时长时间滞留空白页。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Home } from 'lucide-vue-next'

const props = withDefaults(defineProps<{ timeout?: number }>(), {
  timeout: 8000,
})
const emit = defineEmits<{ (e: 'timeout'): void }>()

const timedOut = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  timer = setTimeout(() => {
    timedOut.value = true
    emit('timeout')
  }, props.timeout)
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
    role="status"
    aria-live="polite"
  >
    <div class="relative flex h-12 w-12 items-center justify-center">
      <span class="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
      <span class="absolute inset-2 rounded-full border-2 border-primary/20 animate-ping" style="animation-delay: 0.3s" />
      <span class="h-3 w-3 rounded-full bg-primary" />
    </div>

    <p class="mt-6 font-display text-sm tracking-[0.2em] text-muted-foreground uppercase">
      时光正在加载
    </p>

    <Transition name="fade">
      <button
        v-if="timedOut"
        type="button"
        class="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
        @click="$router.push('/timeline')"
      >
        <Home :size="14" />
        返回首页
      </button>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
