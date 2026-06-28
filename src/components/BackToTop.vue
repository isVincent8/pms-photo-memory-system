<script setup lang="ts">
/**
 * BackToTop —— 回到顶部按钮
 *
 * 页面滚动超过阈值后显示，点击平滑回到顶部。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowUp } from 'lucide-vue-next'

const visible = ref(false)
let scrollTarget: Element | Window = window

function onScroll() {
  const top = scrollTarget instanceof Window ? scrollTarget.scrollY : scrollTarget.scrollTop
  visible.value = top > 300
}

function scrollToTop() {
  if (scrollTarget instanceof Window) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    scrollTarget.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

onMounted(() => {
  const main = document.getElementById('main-content')
  scrollTarget = main ?? window
  scrollTarget.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  scrollTarget.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <Transition name="backtop">
    <button
      v-if="visible"
      type="button"
      class="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-card backdrop-blur-xl transition-colors hover:border-primary hover:text-primary"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      <ArrowUp :size="18" />
    </button>
  </Transition>
</template>

<style scoped>
.backtop-enter-active,
.backtop-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.backtop-enter-from,
.backtop-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
