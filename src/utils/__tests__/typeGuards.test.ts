import { describe, it, expect } from 'vitest'
import { isPhoto, isStage, isAlbum, hasPhotos } from '../typeGuards'

describe('typeGuards', () => {
  describe('isPhoto', () => {
    it('有效 Photo 返回 true', () => {
      expect(isPhoto({ id: 'p1', src: '/img/test.jpg' })).toBe(true)
    })

    it('null 返回 false', () => {
      expect(isPhoto(null)).toBe(false)
    })

    it('缺少 id 返回 false', () => {
      expect(isPhoto({ src: '/img/test.jpg' })).toBe(false)
    })

    it('缺少 src 返回 false', () => {
      expect(isPhoto({ id: 'p1' })).toBe(false)
    })
  })

  describe('isStage', () => {
    it('有效 Stage 返回 true', () => {
      expect(isStage({ id: 's1', name: '童年', content: 'MD' })).toBe(true)
    })

    it('缺少 content 返回 false', () => {
      expect(isStage({ id: 's1', name: '童年' })).toBe(false)
    })
  })

  describe('isAlbum', () => {
    it('有效 Album 返回 true', () => {
      expect(isAlbum({ id: 'a1', title: '相册', date: '2020-01-01' })).toBe(true)
    })

    it('缺少 date 返回 false', () => {
      expect(isAlbum({ id: 'a1', title: '相册' })).toBe(false)
    })
  })

  describe('hasPhotos', () => {
    it('有照片数组返回 true', () => {
      expect(hasPhotos({ photos: [{ id: 'p1', src: '/img/test.jpg' }] })).toBe(true)
    })

    it('空数组返回 false', () => {
      expect(hasPhotos({ photos: [] })).toBe(false)
    })

    it('无 photos 属性返回 false', () => {
      expect(hasPhotos({})).toBe(false)
    })
  })
})
