import { describe, it, expect } from 'vitest'
import { formatDate, formatYear, formatDateRange, formatRelative } from '../dateUtils'

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('格式化有效日期字符串', () => {
      const result = formatDate('2020-06-15')
      expect(result).toContain('2020')
      expect(result).toContain('6')
    })

    it('空输入返回空字符串', () => {
      expect(formatDate(undefined)).toBe('')
      expect(formatDate('')).toBe('')
    })

    it('无效日期返回原值', () => {
      expect(formatDate('not-a-date')).toBe('not-a-date')
    })
  })

  describe('formatYear', () => {
    it('提取年份', () => {
      expect(formatYear('2020-06-15')).toBe('2020')
      expect(formatYear('1998-01-01')).toBe('1998')
    })

    it('空输入返回空字符串', () => {
      expect(formatYear(undefined)).toBe('')
    })

    it('无效日期返回原值', () => {
      expect(formatYear('invalid')).toBe('invalid')
    })
  })

  describe('formatDateRange', () => {
    it('不同年份用 — 连接', () => {
      expect(formatDateRange('1998-01-01', '2010-06-30')).toBe('1998 — 2010')
    })

    it('同年份只显示一个', () => {
      expect(formatDateRange('2020-01-01', '2020-12-31')).toBe('2020')
    })

    it('只有起始年份', () => {
      expect(formatDateRange('2020-01-01', undefined)).toBe('2020')
    })

    it('只有结束年份', () => {
      expect(formatDateRange(undefined, '2020-12-31')).toBe('2020')
    })

    it('都为空返回空字符串', () => {
      expect(formatDateRange(undefined, undefined)).toBe('')
    })
  })

  describe('formatRelative', () => {
    it('格式化有效日期', () => {
      const result = formatRelative('2020-06-15')
      expect(result).toContain('2020')
    })

    it('空输入返回空字符串', () => {
      expect(formatRelative(undefined)).toBe('')
    })

    it('无效日期返回原值', () => {
      expect(formatRelative('invalid')).toBe('invalid')
    })
  })
})
