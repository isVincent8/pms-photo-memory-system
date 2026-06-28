<script setup lang="ts">
/**
 * BaseMap —— 地图容器组件
 *
 * 仅提供占满父容器的画布与挂载点，不含任何地图业务逻辑。
 * 地图功能 Agent 通过 defineExpose 暴露的 `container` ref 接入 Mapbox + deck.gl，
 * 并将图层传入 `layers` prop 或通过 slot 叠加 overlay。
 */
import { ref } from 'vue'

defineProps<{
  /** deck.gl 图层数组，由地图功能 Agent 构造并传入 */
  layers?: unknown[]
  /** 初始中心点 [lng, lat] */
  center?: [number, number]
  /** 初始缩放级别 */
  zoom?: number
}>()

const container = ref<HTMLDivElement | null>(null)

defineExpose({ container })
</script>

<template>
  <div class="relative h-full w-full overflow-hidden bg-secondary">
    <!-- 地图挂载点：地图功能 Agent 在此渲染 Mapbox / deck.gl -->
    <div ref="container" class="absolute inset-0" />

    <!-- 未接入地图时的占位纹理 -->
    <div
      v-if="!layers || layers.length === 0"
      class="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      <div
        class="absolute inset-0 opacity-[0.05]"
        style="
          background-image: radial-gradient(hsl(var(--primary)) 1px, transparent 1px);
          background-size: 28px 28px;
        "
      />
      <p class="font-display text-xs tracking-[0.2em] text-muted-foreground uppercase">
        Map Layer
      </p>
    </div>

    <!-- overlay 插槽：地图详情面板、聚类弹窗等 -->
    <slot name="overlay" />
  </div>
</template>
