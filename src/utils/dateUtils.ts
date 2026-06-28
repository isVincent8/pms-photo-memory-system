/** 日期格式化与范围工具 */

export function formatDate(input?: string, locale = 'zh-CN'): string {
  if (!input) return ''
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

export function formatYear(input?: string): string {
  if (!input) return ''
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input
  return String(d.getFullYear())
}

export function formatDateRange(start?: string, end?: string): string {
  const s = formatYear(start)
  const e = formatYear(end)
  if (!s && !e) return ''
  if (s && e && s !== e) return `${s} — ${e}`
  return s || e || ''
}

export function formatRelative(input?: string, locale = 'zh-CN'): string {
  if (!input) return ''
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function getYearMonth(input?: string): { year: string; month: string } | null {
  if (!input) return null
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return null
  const year = String(d.getFullYear())
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return { year, month }
}

export function formatYearMonth(input?: string, locale = 'zh-CN'): string {
  if (!input) return ''
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(d)
}
