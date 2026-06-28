<script setup lang="ts">
/**
 * KeyboardShortcutsHelp —— 快捷键帮助面板
 *
 * 按 ? 触发，展示应用内常用键盘操作。
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { X, CornerDownLeft } from 'lucide-vue-next'

const ui = useUiStore()

const shortcuts = [
  { keys: ['?'], desc: '打开/关闭快捷键帮助' },
  { keys: ['Esc'], desc: '关闭灯箱、幻灯片或本面板' },
  { keys: ['←', '→'], desc: '灯箱/照片页切换上一张/下一张' },
  { keys: ['Space'], desc: '幻灯片模式下播放/暂停' },
  { keys: ['/'], desc: '聚焦搜索框（搜索页）' },
]

function onKey(e: KeyboardEvent) {
  if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    // 避免在输入框内触发
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    ui.toggleShortcutsHelp()
  } else if (e.key === 'Escape' && ui.shortcutsHelpOpen) {
    ui.closeShortcutsHelp()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Transition name="help">
    <div
      v-if="ui.shortcutsHelpOpen"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-background/90 p-4 backdrop-blur-xl"
      @click="ui.closeShortcutsHelp"
    >
      <div
        class="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-pop"
        @click.stop
      >
        <div class="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 class="font-display text-sm font-semibold text-foreground">键盘快捷键</h2>
          <button
            type="button"
            class="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="关闭"
            @click="ui.closeShortcutsHelp"
          >
            <X :size="16" />
          </button>
        </div>

        <div class="p-5">
          <ul class="space-y-3">
            <li
              v-for="item in shortcuts"
              :key="item.desc"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-muted-foreground">{{ item.desc }}</span>
              <span class="flex items-center gap-1">
                <kbd
                  v-for="key in item.keys"
                  :key="key"
                  class="inline-flex min-w-[1.75rem] items-center justify-center rounded border border-border bg-secondary px-1.5 py-0.5 text-xs font-medium text-foreground"
                >
                  <CornerDownLeft v-if="key === 'Enter'" :size="10" />
                  <span v-else>{{ key }}</span>
                </kbd>
              </span>
            </li>
          </ul>
        </div>

        <div class="border-t border-border bg-secondary/30 px-5 py-3 text-center text-[11px] text-muted-foreground">
          在输入框内按 ? 不会触发此面板
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.help-enter-active,
.help-leave-active {
  transition: opacity 0.2s ease;
}
.help-enter-from,
.help-leave-to {
  opacity: 0;
}
</style>
