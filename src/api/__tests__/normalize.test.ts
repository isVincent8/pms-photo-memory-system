import { describe, it, expect } from 'vitest'
import { normalizeIndex } from '../index'

// 构造测试用的原始数据结构（不需要导出 RawIndex）
function makeRaw(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.0.0',
    generatedAt: '2026-01-01T00:00:00Z',
    site: { title: 'Test' },
    stages: [],
    albums: [],
    people: [],
    places: [],
    photos: [],
    ...overrides,
  } as Parameters<typeof normalizeIndex>[0]
}

describe('normalizeIndex', () => {
  const baseRaw = makeRaw()

  it('空输入返回空数组结构和默认值', () => {
    const result = normalizeIndex({})
    expect(result.stages).toEqual([])
    expect(result.albums).toEqual([])
    expect(result.people).toEqual([])
    expect(result.places).toEqual([])
    expect(result.photos).toEqual([])
    expect(result.version).toBe('0.0.0')
    expect(result.generatedAt).toBeTruthy()
  })

  it('保留 version 和 generatedAt', () => {
    const result = normalizeIndex(baseRaw)
    expect(result.version).toBe('1.0.0')
    expect(result.generatedAt).toBe('2026-01-01T00:00:00Z')
  })

  it('lat/lng 归一化为 latitude/longitude', () => {
    const raw = makeRaw({
      places: [
        {
          id: 'p1',
          name: '北京',
          location: { lat: 39.9, lng: 116.4, name: '北京' },
        },
      ],
      photos: [
        {
          id: 'ph1',
          src: '/img/test.jpg',
          location: { lat: 30.5, lng: 114.3, name: '武汉' },
        },
      ],
    })
    const result = normalizeIndex(raw)
    expect(result.places[0].location).toEqual({
      latitude: 39.9,
      longitude: 116.4,
      name: '北京',
    })
    expect(result.photos[0].location).toEqual({
      latitude: 30.5,
      longitude: 114.3,
      name: '武汉',
    })
  })

  it('latitude/longitude 原样保留', () => {
    const raw = makeRaw({
      places: [
        {
          id: 'p1',
          name: '上海',
          location: { latitude: 31.2, longitude: 121.5, name: '上海' },
        },
      ],
    })
    const result = normalizeIndex(raw)
    expect(result.places[0].location).toEqual({
      latitude: 31.2,
      longitude: 121.5,
      name: '上海',
    })
  })

  it('丢弃无 location 的 place', () => {
    const raw = makeRaw({
      places: [
        { id: 'p1', name: '有坐标', location: { latitude: 1, longitude: 2 } },
        { id: 'p2', name: '无坐标', location: undefined },
        { id: 'p3', name: '字符串坐标', location: '北京' as unknown },
      ],
    })
    const result = normalizeIndex(raw)
    expect(result.places).toHaveLength(1)
    expect(result.places[0].id).toBe('p1')
  })

  it('album.stage 兼容为 stageId', () => {
    const raw = makeRaw({
      albums: [
        { id: 'a1', title: 'Test', date: '2020-01-01', stage: 'stage-1' },
      ],
    })
    const result = normalizeIndex(raw)
    expect(result.albums[0].stageId).toBe('stage-1')
  })

  it('album.location 字符串归一化为 undefined', () => {
    const raw = makeRaw({
      albums: [
        { id: 'a1', title: 'Test', date: '2020-01-01', location: '武汉' as unknown },
      ],
    })
    const result = normalizeIndex(raw)
    expect(result.albums[0].location).toBeUndefined()
  })

  it('album.location 对象保留', () => {
    const raw = makeRaw({
      albums: [
        {
          id: 'a1',
          title: 'Test',
          date: '2020-01-01',
          location: { latitude: 30.5, longitude: 114.3, name: '武汉' },
        },
      ],
    })
    const result = normalizeIndex(raw)
    expect(result.albums[0].location).toEqual({
      latitude: 30.5,
      longitude: 114.3,
      name: '武汉',
    })
  })

  it('person.stages 兼容为 stageIds', () => {
    const raw = makeRaw({
      people: [
        { id: 'me', name: '我', stages: ['s1', 's2'] },
      ],
    })
    const result = normalizeIndex(raw)
    expect(result.people[0].stageIds).toEqual(['s1', 's2'])
  })

  it('person.stageIds 优先于 stages', () => {
    const raw = makeRaw({
      people: [
        { id: 'me', name: '我', stageIds: ['s1'], stages: ['s2'] },
      ],
    })
    const result = normalizeIndex(raw)
    expect(result.people[0].stageIds).toEqual(['s1'])
  })

  it('无 location 的 photo 保留但 location 为 undefined', () => {
    const raw = makeRaw({
      photos: [
        { id: 'ph1', src: '/img/test.jpg', location: undefined },
      ],
    })
    const result = normalizeIndex(raw)
    expect(result.photos).toHaveLength(1)
    expect(result.photos[0].location).toBeUndefined()
  })
})
