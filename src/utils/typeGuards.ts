import type { Album, Photo, Stage } from '@/types'

export function isPhoto(v: unknown): v is Photo {
  return typeof v === 'object' && v !== null && 'id' in v && 'src' in v
}

export function isStage(v: unknown): v is Stage {
  return typeof v === 'object' && v !== null && 'id' in v && 'name' in v && 'content' in v
}

export function isAlbum(v: unknown): v is Album {
  return typeof v === 'object' && v !== null && 'id' in v && 'title' in v && 'date' in v
}

export function hasPhotos(value: { photos?: Photo[] }): boolean {
  return Array.isArray(value.photos) && value.photos.length > 0
}
