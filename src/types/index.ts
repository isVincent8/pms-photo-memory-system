// PMS 统一类型定义
// 归属：前端基础架构 Agent。地图功能 Agent 仅消费，不修改。
// location 字段遵循 schema.json 约定：{ latitude, longitude, name? }
// index.json 写入权归数据工程 Agent，前端只读消费。

export type StageType = 'education' | 'career' | 'travel' | 'family' | 'custom'
export type ViewMode = 'timeline' | 'grid' | 'masonry' | 'slideshow' | 'map' | 'people'

export interface GeoLocation {
  latitude: number
  longitude: number
  name?: string
}

export interface ExifInfo {
  camera?: string
  lens?: string
  aperture?: string
  shutter?: string
  iso?: number
  focalLength?: string
  takenAt?: string
}

export interface ImageSrcSet {
  small?: string
  medium?: string
  large?: string
}

export interface Photo {
  id: string
  src: string
  thumbnail?: string
  srcset?: ImageSrcSet
  caption?: string
  date?: string | null
  location?: GeoLocation
  people?: string[]
  tags?: string[]
  exif?: ExifInfo
  stageId?: string
  albumId?: string
  width?: number
  height?: number
}

export interface Place {
  id: string
  name: string
  location: GeoLocation
  stageIds?: string[]
  photoIds?: string[]
  content?: string
}

export interface Stage {
  id: string
  name: string
  type: StageType
  startDate: string
  endDate: string
  cover?: string
  themeColor: string
  locations?: string[]
  people?: string[]
  tags?: string[]
  content?: string
  description?: string
  albumIds?: string[]
  photoIds?: string[]
}

export interface Album {
  id: string
  title: string
  date: string
  location?: GeoLocation
  stageId?: string
  cover?: string
  photoIds?: string[]
  content?: string
}

export interface Person {
  id: string
  name: string
  avatar?: string
  stageIds?: string[]
  bio?: string
  content?: string
}

export interface SiteMeta {
  title: string
  author?: string
  subtitle?: string
  description?: string
}

export interface PmsIndex {
  version: string
  generatedAt: string
  site?: SiteMeta
  stages: Stage[]
  albums: Album[]
  people: Person[]
  places: Place[]
  photos: Photo[]
}

export interface ApiResponse<T> {
  data: T
  error?: string
}

// —— 地图功能专用类型（地图功能 Agent 维护） ——

export type MapPointKind = 'photo' | 'place'

export interface MapPointProperties {
  kind: MapPointKind
  id: string
  name?: string
  thumbnail?: string
  date?: string | null
  stageId?: string
  albumId?: string
  locationName?: string
}

// supercluster 输入：GeoJSON PointFeature
export interface MapPointFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: MapPointProperties
}

// supercluster 聚类输出
export interface MapClusterFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: {
    cluster: true
    cluster_id: number
    point_count: number
    point_count_abbreviated: number
  }
}

export interface MapBounds {
  west: number
  south: number
  east: number
  north: number
}

// deck.gl picking 回调参数（v9 不再从 @deck.gl/core 导出，此处补齐）
export interface PickingInfo<T> {
  x: number
  y: number
  object?: T | null
  coordinate?: number[]
  index?: number
}
