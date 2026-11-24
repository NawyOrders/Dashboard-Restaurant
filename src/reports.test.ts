import { describe, expect, it } from 'vitest'
import { createMockApi } from './api/mockApi'
import { translations } from './i18n'
import { buildReportsCsv } from './reports'

describe('reports CSV export', () => {
  it('includes summary metrics, payment split, and best sellers', async () => {
    const api = createMockApi({ latencyMs: 0 })
    const summary = await api.getReportsSummary('week')
    const csv = buildReportsCsv(summary, translations.ar, 'ar')

    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('ملخص التقرير')
    expect(csv).toContain('آخر 7 أيام')
    expect(csv).toContain('48,250')
    expect(csv).toContain('طرق الدفع')
    expect(csv).toContain('إنستا باي,32%,411')
    expect(csv).toContain('الأكثر مبيعاً')
    expect(csv).toContain('برجر كلاسيك,312,"9,860"')
  })
})
