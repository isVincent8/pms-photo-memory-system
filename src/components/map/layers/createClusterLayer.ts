import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import type { Layer } from '@deck.gl/core'
import type { MapClusterFeature, PickingInfo } from '@/types'

export interface ClusterLayerHandlers {
  onExpand: (clusterId: number, coords: [number, number]) => void
  onHover: (info: { x: number; y: number; object: MapClusterFeature | null }) => void
}

// 按 point_count 渐变：少→primary 深绿，多→accent 深蓝
function clusterColor(count: number): [number, number, number, number] {
  if (count < 5) return [59, 77, 62, 225]
  if (count < 15) return [52, 80, 78, 235]
  if (count < 30) return [45, 78, 92, 245]
  return [38, 74, 103, 245]
}

/**
 * 聚类图层：实心圆（半径随点数增长）+ 中央数字。
 * 点击聚类 → onExpand，由 MapView 调用 maplibre easeTo 展开到下一级 zoom。
 */
export function createClusterLayer(data: MapClusterFeature[], handlers: ClusterLayerHandlers): Layer[] {
  const circle = new ScatterplotLayer({
    id: 'pms-cluster-layer',
    data,
    getPosition: (d: MapClusterFeature) => d.geometry.coordinates,
    getFillColor: (d: MapClusterFeature) => clusterColor(d.properties.point_count),
    getLineColor: [255, 255, 255, 200],
    lineWidthMinPixels: 2,
    stroked: true,
    getRadius: (d: MapClusterFeature) => 40 + Math.sqrt(d.properties.point_count) * 8,
    radiusMinPixels: 18,
    radiusMaxPixels: 60,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 90],
    onClick: (info: PickingInfo<MapClusterFeature>) => {
      if (info.object) {
        handlers.onExpand(info.object.properties.cluster_id, info.object.geometry.coordinates)
      }
      return true
    },
    onHover: (info: PickingInfo<MapClusterFeature>) =>
      handlers.onHover({ x: info.x, y: info.y, object: info.object ?? null }),
    parameters: { depthTest: false },
  })

  const text = new TextLayer({
    id: 'pms-cluster-text',
    data,
    getPosition: (d: MapClusterFeature) => d.geometry.coordinates,
    getText: (d: MapClusterFeature) => String(d.properties.point_count),
    getSize: 14,
    getColor: [255, 255, 255, 255],
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'center',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 700,
    pickable: false,
    parameters: { depthTest: false },
  })

  return [circle, text]
}
