import type { ReportsSummary } from './api/types'
import type { Lang, T } from './i18n'
import { formatNumber } from './orders'

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(',')
}

export function buildReportsCsv(summary: ReportsSummary, t: T, lang: Lang): string {
  const labels = t.reports.csv
  const rows: string[][] = [
    [labels.summary],
    [labels.metric, labels.value],
    [labels.period, t.reports[summary.range]],
    [t.reports.revenue, formatNumber(summary.revenue, lang)],
    [t.reports.orders, formatNumber(summary.orders, lang)],
    [t.reports.avgOrder, formatNumber(summary.averageOrder, lang, 1)],
    [t.reports.netProfit, formatNumber(summary.netProfit, lang)],
    [],
    [labels.paymentMethods],
    [labels.method, labels.percentage, labels.count],
    ...summary.payments.map((payment) => [
      t.reports.payment[payment.key],
      `${formatNumber(payment.percentage, lang)}%`,
      formatNumber(payment.count, lang),
    ]),
    [],
    [labels.bestSellers],
    [labels.item, labels.units, labels.revenue],
    ...summary.bestSellers.map((seller) => [
      lang === 'ar' ? seller.nameAr : seller.nameEn,
      formatNumber(seller.units, lang),
      formatNumber(seller.revenue, lang),
    ]),
  ]

  return `\uFEFF${rows.map(csvRow).join('\r\n')}`
}
