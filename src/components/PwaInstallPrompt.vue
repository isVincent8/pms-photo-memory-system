<script setup lang="ts">
/**
 * PwaInstallPrompt —— PWA 安装提示条
 *
 * 监听 beforeinstallprompt 事件，在支持安装的浏览器中展示底部提示条。
 */
import { onMounted, onUnmounted, ref } from 'vue'
import { Download, X } from 'lucide-vue-next'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const visible = ref(false)
const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)

let installHandler: ((e: Event) => void) | null = null
let installedHandler: (() => void) | null = null

onMounted(() => {
  installHandler = (e: Event) => {
    e.preventDefault()
    deferredPrompt.value = e as BeforeInstallPromptEvent
    visible.value = true
  }
  installedHandler = () => {
    visible.value = false
    deferredPrompt.value = null
  }

  window.addEventListener('beforeinstallprompt', installHandler)
  window.addEventListener('appinstalled', installedHandler)
})

onUnmounted(() => {
  if (installHandler) window.removeEventListener('beforeinstallprompt', installHandler)
  if (installedHandler) window.removeEventListener('appinstalled', installedHandler)
})

async function install() {
  const prompt = deferredPrompt.value
  if (!prompt || typeof prompt.prompt !== 'function') return
  await prompt.prompt()
  const choice = await prompt.userChoice
  if (choice?.outcome === 'accepted') {
    visible.value = false
    deferredPrompt.value = null
  }
}

function dismiss() {
  visible.value = false
}
</script>

<template>
  <Transition name="prompt">
    <div
      v-if="visible"
      class="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-xl border border-border bg-card/95 p-4 shadow-card backdrop-blur-xl md:left-auto md:right-6 md:w-80"
      role="dialog"
      aria-live="polite"
    >
      <div class="flex items-start gap-3">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Download :size="18" />
        </div>
        <div class="flex-1">
          <p class="text-sm font-medium text-foreground">安装时光纪</p>
          <p class="mt-0.5 text-xs text-muted-foreground">添加到桌面，离线也能快速访问你的回忆。</p>
          <div class="mt-3 flex items-center gap-2">
            <button
              type="button"
              class="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              @click="install"
            >
              安装
            </button>
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              @click="dismiss"
            >
              稍后再说
            </button>
          </div>
        </div>
        <button
          type="button"
          class="rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="关闭"
          @click="dismiss"
        >
          <X :size="14" />
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.prompt-enter-active,
.prompt-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.prompt-enter-from,
.prompt-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
