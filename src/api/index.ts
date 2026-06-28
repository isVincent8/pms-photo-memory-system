/**
 * API 数据层
 *
 * 职责：
 *  - 拉取 /data/index.json 并归一化（lat/lng → latitude/longitude）
 *  - 兼容旧字段名：album.stage → stageId, person.stages → stageIds
 *  - 内存缓存，避免重复请求
 *  - 提供按需查询 getStage / getAlbum / getPerson / getPlace
 *
 * 所有视图与 store 须通过此层获取数据，禁止直接 fetch。
 */
import type { Album, GeoLocation, Person, Photo, Place, PmsIndex, Stage } from '@/types'

// —— 兼容旧版 index.json 的原始字段名 ——

interface RawLocation {
  latitude?: number
  longitude?: number
  lat?: number
  lng?: number
  name?: string
}

interface RawPhoto extends Omit<Photo, 'location'> {
  location?: RawLocation
}

interface RawPlace extends Omit<Place, 'location'> {
  location?: RawLocation
  description?: string
  photoCount?: number
}

interface RawAlbum extends Omit<Album, 'location'> {
  location?: GeoLocation | string
  stage?: string
  photoCount?: number
}

interface RawPerson extends Omit<Person, 'stageIds'> {
  stageIds?: string[]
  stages?: string[]
}

interface RawStage extends Stage {
  // no extra fields, but content may be inline MD
}

interface RawIndex {
  version?: string
  generatedAt?: string
  site?: PmsIndex['site']
  stages?: RawStage[]
  albums?: RawAlbum[]
  people?: RawPerson[]
  places?: RawPlace[]
  photos?: RawPhoto[]
}

function normalizeLocation(raw: RawLocation | string | undefined): GeoLocation | undefined {
  if (!raw || typeof raw === 'string') return undefined
  const latitude = raw.latitude ?? raw.lat
  const longitude = raw.longitude ?? raw.lng
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return undefined
  return { latitude, longitude, name: raw.name }
}

export function normalizeIndex(raw: RawIndex): PmsIndex {
  return {
    version: raw.version ?? '0.0.0',
    generatedAt: raw.generatedAt ?? new Date().toISOString(),
    site: raw.site,
    stages: raw.stages ?? [],
    albums: (raw.albums ?? []).map((a) => ({
      ...a,
      location: typeof a.location === 'object' ? a.location : undefined,
      stageId: a.stageId ?? a.stage,
    })),
    people: (raw.people ?? []).map((p) => ({
      ...p,
      stageIds: p.stageIds ?? p.stages,
    })),
    places: (raw.places ?? []).reduce<Place[]>((acc, p) => {
      const location = normalizeLocation(p.location)
      if (location) acc.push({ ...p, location })
      return acc
    }, []),
    photos: (raw.photos ?? []).map((p) => ({ ...p, location: normalizeLocation(p.location) })),
  }
}

let cache: PmsIndex | null = null

export async function loadIndex(): Promise<PmsIndex> {
  if (cache) return cache
  const res = await fetch('/data/index.json')
  if (!res.ok) throw new Error(`加载索引失败: HTTP ${res.status}`)
  const raw = (await res.json()) as RawIndex
  cache = normalizeIndex(raw)
  return cache
}

export async function getStage(id: string): Promise<Stage | undefined> {
  const idx = await loadIndex()
  return idx.stages.find((s) => s.id === id)
}

export async function getAlbum(id: string): Promise<Album | undefined> {
  const idx = await loadIndex()
  return idx.albums.find((a) => a.id === id)
}

export async function getPerson(id: string): Promise<Person | undefined> {
  const idx = await loadIndex()
  return idx.people.find((p) => p.id === id)
}

export async function getPlace(id: string): Promise<Place | undefined> {
  const idx = await loadIndex()
  return idx.places.find((p) => p.id === id)
}

export async function getPhoto(id: string): Promise<Photo | undefined> {
  const idx = await loadIndex()
  return idx.photos.find((p) => p.id === id)
}

export function clearCache(): void {
  cache = null
}
