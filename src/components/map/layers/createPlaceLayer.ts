import { ScatterplotLayer } from '@deck.gl/layers'
import type { MapPointFeature, PickingInfo } from '@/types'
import type { PointLayerHandlers } from './createPhotoLayer'

/**
 * 地点点图层：较大空心 accent 圆环，与照片点区分；点击选中地点。
 */
export function createPlaceLayer(data: MapPointFeature[], handlers: PointLayerHandlers): ScatterplotLayer {
  return new ScatterplotLayer({
    id: 'pms-place-layer',
    data,
    getPosition: (d: MapPointFeature) => d.geometry.coordinates,
    getFillColor: [38, 74, 103, 40],
    getLineColor: [38, 74, 103, 255],
    lineWidthMinPixels: 2,
    stroked: true,
    getRadius: 220,
    radiusMinPixels: 11,
    radiusMaxPixels: 28,
    pickable: true,
    autoHighlight: true,
    highlightColor: [59, 77, 62, 110],
    onClick: (info: PickingInfo<MapPointFeature>) => {
      if (info.object) handlers.onSelect('place', info.object.properties.id)
      return true
    },
    onHover: (info: PickingInfo<MapPointFeature>) =>
      handlers.onHover({ x: info.x, y: info.y, object: info.object ?? null }),
    parameters: { depthTest: false },
  })
}
