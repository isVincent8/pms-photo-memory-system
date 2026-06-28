import { shallowRef, watch, type Ref } from 'vue'
import Supercluster from 'supercluster'
import type { MapClusterFeature, MapPointFeature } from '@/types'

type AnyFeature = MapPointFeature | MapClusterFeature

export interface UseSuperclusterReturn {
  /** supercluster 实例（shallow，点击聚类展开时用其 getClusterExpansionZoom） */
  index: Ref<Supercluster | null>
  /** 取当前视口 + 缩放级别下的聚类/单点 */
  getClusters: (bbox: [number, number, number, number], zoom: number) => AnyFeature[]
  /** 聚类展开到下一级所需的 zoom */
  getExpansionZoom: (clusterId: number) => number
}

/**
 * 把 photos + places 的点喂给 supercluster 建立空间索引；
 * 数据变化时自动重建。视口裁切与按缩放聚合由 getClusters 完成。
 */
export function useSupercluster(
  points: Ref<MapPointFeature[]>,
  options?: { radius?: number; maxZoom?: number },
): UseSuperclusterReturn {
  const index = shallowRef<Supercluster | null>(null)

  const build = (pts: MapPointFeature[]) => {
    const sc = new Supercluster({
      radius: options?.radius ?? 40,
      maxZoom: options?.maxZoom ?? 16,
    })
    sc.load(pts)
    index.value = sc
  }

  watch(points, (pts) => build(pts), { immediate: true })

  const getClusters = (bbox: [number, number, number, number], zoom: number): AnyFeature[] => {
    if (!index.value) return []
    return index.value.getClusters(bbox, Math.floor(zoom)) as unknown as AnyFeature[]
  }

  const getExpansionZoom = (clusterId: number): number => {
    if (!index.value) return 0
    return index.value.getClusterExpansionZoom(clusterId)
  }

  return { index, getClusters, getExpansionZoom }
}
