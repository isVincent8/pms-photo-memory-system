import { ScatterplotLayer } from '@deck.gl/layers'
import type { MapPointFeature, MapPointKind, PickingInfo } from '@/types'

export interface PointLayerHandlers {
  onSelect: (kind: MapPointKind, id: string) => void
  onHover: (info: { x: number; y: number; object: MapPointFeature | null }) => void
}

/**
 * 照片点图层：primary 实心圆，pickable，点击选中、悬停出 tooltip。
 */
export function createPhotoLayer(data: MapPointFeature[], handlers: PointLayerHandlers): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'pms-photo-layer',
    data,
    getPosition: (d: MapPointFeature) => d.geometry.coordinates,
    getFillColor: [59, 77, 62, 220],
    getLineColor: [255, 255, 255, 255],
    lineWidthMinPixels: 1.5,
    stroked: true,
    getRadius: 60,
    radiusMinPixels: 5,
    radiusMaxPixels: 14,
    pickable: true,
    autoHighlight: true,
    highlightColor: [38, 74, 103, 140],
    onClick: (info: PickingInfo<MapPointFeature>) => {
      if (info.object) handlers.onSelect('photo', info.object.properties.id)
      return true
    },
    onHover: (info: PickingInfo<MapPointFeature>) =>
      handlers.onHover({ x: info.x, y: info.y, object: info.object ?? null }),
    parameters: { depthTest: false },
  })
}
