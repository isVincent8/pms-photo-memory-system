/**
 * useFocusTrap —— 焦点陷阱
 *
 * 在 Modal/Lightbox 打开时将焦点限制在容器内，并按 Tab 循环。
 * 关闭时（可选）将焦点恢复到之前激活的元素。
 */
import { onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function useFocusTrap(containerRef: Ref<HTMLElement | null>, active: Ref<boolean>) {
  const previousActive = ref<Element | null>(null)

  function getFocusable(): HTMLElement[] {
    const root = containerRef.value
    if (!root) return []
    return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el.offsetParent !== null,
    )
  }

  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Tab' || !active.value) return
    const focusable = getFocusable()
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', onKey)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKey)
    if (previousActive.value instanceof HTMLElement) {
      previousActive.value.focus()
    }
  })

  watch(active, (isActive, wasActive) => {
    if (isActive && !wasActive) {
      previousActive.value = document.activeElement
      requestAnimationFrame(() => {
        const focusable = getFocusable()
        focusable[0]?.focus()
      })
    }
  })
}
