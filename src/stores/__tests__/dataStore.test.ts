import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDataStore } from '../dataStore'

// mock fetch 返回测试数据
const mockIndex = {
  version: '1.0.0',
  generatedAt: '2026-01-01T00:00:00Z',
  site: { title: '测试时光纪' },
  stages: [
    {
      id: 'childhood',
      name: '童年',
      type: 'family' as const,
      startDate: '1998-01-01',
      endDate: '2010-06-30',
      themeColor: '#ff6a2b',
      content: '# 童年',
      photoIds: ['p1', 'p2'],
    },
    {
      id: 'university',
      name: '大学',
      type: 'education' as const,
      startDate: '2015-09-01',
      endDate: '2019-06-30',
      themeColor: '#4a90d9',
      content: '# 大学',
      photoIds: ['p3'],
    },
  ],
  albums: [
    {
      id: 'graduation',
      title: '毕业',
      date: '2019-06-20',
      stageId: 'university',
      photoIds: ['p3'],
    },
  ],
  people: [
    {
      id: 'me',
      name: '我',
      stageIds: ['childhood', 'university'],
    },
  ],
  places: [
    {
      id: 'wuhan',
      name: '武汉',
      location: { latitude: 30.5, longitude: 114.3, name: '武汉' },
      stageIds: ['university'],
      photoIds: ['p3'],
    },
  ],
  photos: [
    {
      id: 'p1',
      src: '/img/p1.jpg',
      thumbnail: '/img/p1.thumb.jpg',
      stageId: 'childhood',
      location: { latitude: 30.5, longitude: 114.3, name: '武汉' },
    },
    {
      id: 'p2',
      src: '/img/p2.jpg',
      thumbnail: '/img/p2.thumb.jpg',
      stageId: 'childhood',
      people: ['me'],
    },
    {
      id: 'p3',
      src: '/img/p3.jpg',
      thumbnail: '/img/p3.thumb.jpg',
      stageId: 'university',
      albumId: 'graduation',
      people: ['me'],
      location: { latitude: 30.5, longitude: 114.3, name: '武汉' },
    },
  ],
}

describe('dataStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockIndex),
      }),
    ))
  })

  it('load() 加载数据后 loaded 为 true', async () => {
    const store = useDataStore()
    expect(store.loaded).toBe(false)
    await store.load()
    console.log('store.error:', store.error)
    expect(store.loaded).toBe(true)
  })

  it('getStage 按 id 查询', async () => {
    const store = useDataStore()
    await store.load()
    const stage = store.getStage('childhood')
    expect(stage?.name).toBe('童年')
    expect(store.getStage('nonexistent')).toBeUndefined()
  })

  it('getAlbum 按 id 查询', async () => {
    const store = useDataStore()
    await store.load()
    const album = store.getAlbum('graduation')
    expect(album?.title).toBe('毕业')
  })

  it('getPerson 按 id 查询', async () => {
    const store = useDataStore()
    await store.load()
    const person = store.getPerson('me')
    expect(person?.name).toBe('我')
  })

  it('getPlace 按 id 查询', async () => {
    const store = useDataStore()
    await store.load()
    const place = store.getPlace('wuhan')
    expect(place?.name).toBe('武汉')
  })

  it('photosOfStage 按阶段过滤照片', async () => {
    const store = useDataStore()
    await store.load()
    const photos = store.photosOfStage('childhood')
    expect(photos).toHaveLength(2)
    expect(photos.every((p) => p.stageId === 'childhood')).toBe(true)
  })

  it('photosOfAlbum 按相册过滤照片', async () => {
    const store = useDataStore()
    await store.load()
    const photos = store.photosOfAlbum('graduation')
    expect(photos).toHaveLength(1)
    expect(photos[0].id).toBe('p3')
  })

  it('photosOfPerson 按人物过滤照片', async () => {
    const store = useDataStore()
    await store.load()
    const photos = store.photosOfPerson('me')
    expect(photos).toHaveLength(2)
    expect(photos.map((p) => p.id).sort()).toEqual(['p2', 'p3'])
  })

  it('photosAtPlace 按地点过滤照片', async () => {
    const store = useDataStore()
    await store.load()
    const photos = store.photosAtPlace('wuhan')
    expect(photos).toHaveLength(2)
  })

  it('photosWithLocation 只返回有坐标的照片', async () => {
    const store = useDataStore()
    await store.load()
    expect(store.photosWithLocation).toHaveLength(2)
    expect(store.photosWithLocation.every((p) => p.location)).toBe(true)
  })

  it('placesWithLocation 只返回有坐标的地点', async () => {
    const store = useDataStore()
    await store.load()
    expect(store.placesWithLocation).toHaveLength(1)
    expect(store.placesWithLocation[0].name).toBe('武汉')
  })
})
