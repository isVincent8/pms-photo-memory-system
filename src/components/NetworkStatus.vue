<script setup lang="ts">
/**
 * NetworkStatus —— 网络状态指示器
 *
 * 当浏览器进入离线状态时，在顶部显示提示条；恢复在线后自动隐藏。
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { WifiOff } from 'lucide-vue-next'

const online = ref(true)

function update() {
  online.value = navigator.onLine
}

onMounted(() => {
  online.value = navigator.onLine
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
})

onUnmounted(() => {
  window.removeEventListener('online', update)
  window.removeEventListener('offline', update)
})
</script>

<template>
  <Transition name="network">
    <div
      v-if="!online"
      class="fixed top-16 z-40 flex w-full items-center justify-center gap-2 bg-destructive/90 px-4 py-1.5 text-xs font-medium text-destructive-foreground backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <WifiOff :size="14" />
      当前处于离线模式，部分内容可能无法加载
    </div>
  </Transition>
</template>

<style scoped>
.network-enter-active,
.network-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.network-enter-from,
.network-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
