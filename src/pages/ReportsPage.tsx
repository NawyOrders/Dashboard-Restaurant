import { useEffect, useState, type ReactNode } from 'react'
import type { Api } from '../api'
import type { PaymentBreakdown, PaymentMethodKey, PeakHourPoint, ReportRange, ReportsSummary } from '../api/types'
import type { Lang, T } from '../i18n'
import { formatNumber, formatOrderTotal, numberLocale } from '../orders'
import { buildReportsCsv } from '../reports'
import { PageHeading } from '../components/PageHeading'
import {
  ArrowUpIcon,
  CalendarIcon,
  ChartIcon,
  DownloadIcon,
  MoreIcon,
  ReceiptIcon,
  SpinnerIcon,
} from '../icons'

export type ReportsPageProps = {
  t: T
  lang: Lang
  api: Api
  onToast: (message: string) => void
}

const RANGES: ReportRange[] = ['today', 'week', 'month']

const PAYMENT_COLORS: Record<PaymentMethodKey, string> = {
  cash: '#E2372B',
  instapay: '#7B2CBF',
  wallet: '#F4B183',
}

function hourLabel(hour: number, lang: Lang): string {
  const display = hour % 12 === 0 ? 12 : hour % 12
  if (lang === 'ar') return `${display} ${hour < 12 ? 'ص' : 'م'}`
  return `${display} ${hour < 12 ? 'AM' : 'PM'}`
}

function formatShortDate(iso: string, lang: Lang): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(numberLocale(lang), { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function smoothPath(points: ReadonlyArray<readonly [number, number]>): string {
  if (points.length === 0) return ''
  let path = `M${points[0][0]},${points[0][1]}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] ?? p2
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6
    path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`
  }
  return path
}

export default function ReportsPage({ t, lang, api, onToast }: ReportsPageProps) {
  const [range, setRange] = useState<ReportRange>('week')
  const [summary, setSummary] = useState<ReportsSummary | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState('loading')
    api
      .getReportsSummary(range)
      .then((data) => {
        if (cancelled) return
        setSummary(data)
        setState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [api, range, reloadKey])

  const handleExport = () => {
    if (!summary) return
    downloadCsv(`nawy-report-${summary.range}.csv`, buildReportsCsv(summary, t, lang))
    onToast(t.reports.exported)
  }

  return (
    <div>
      <PageHeading
        title={t.reports.title}
        subtitle={t.reports.subtitle}
        action={
          <>
            <div role="group" aria-label={t.reports.title} className="inline-flex rounded-xl border border-line bg-white p-1">
              {RANGES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRange(option)}
                  aria-pressed={range === option}
                  className={`min-h-9 rounded-lg px-3 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 ${range === option ? 'bg-brand-600 text-white' : 'text-stone-600 hover:bg-cream-50'}`}
                >
                  {t.reports[option]}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={!summary}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-300 bg-white px-4 text-sm font-bold text-brand-600 transition-colors hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              <DownloadIcon className="h-4 w-4" />
              {t.reports.export}
            </button>
          </>
        }
      />

      {state === 'loading' && !summary && (
        <div role="status" aria-live="polite" className="dashboard-panel flex items-center gap-3 p-6 text-sm font-semibold text-stone-500">
          <SpinnerIcon className="h-5 w-5 text-brand-600" />
          {t.reports.loading}
        </div>
      )}

      {state === 'error' && !summary && (
        <div role="alert" className="dashboard-panel flex flex-wrap items-center justify-between gap-3 p-6 text-sm font-semibold text-brand-700">
          <span>{t.reports.loadError}</span>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="inline-flex min-h-10 items-center rounded-xl bg-brand-600 px-4 text-xs font-bold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            {t.reports.retry}
          </button>
        </div>
      )}

      {summary && (
        <div className={`transition-opacity ${state === 'loading' ? 'opacity-60' : ''}`}>
          {state === 'error' && (
            <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700">
              <span>{t.reports.loadError}</span>
              <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="text-xs font-bold underline underline-offset-2">
                {t.reports.retry}
              </button>
            </div>
          )}

          <section className="dashboard-panel relative overflow-hidden p-5 sm:p-6">
            <svg viewBox="0 0 800 80" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full text-brand-200/50" aria-hidden="true">
              <path d="M0 50 C 150 10, 300 70, 450 40 S 700 10, 800 40 L800 80 L0 80 Z" fill="currentColor" />
            </svg>

            <div className="relative z-10 flex flex-wrap items-start justify-between gap-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-bold text-stone-600">{t.reports.revenue}</h2>
                  <span className="inline-flex items-center gap-1 rounded-full bg-mint-100 px-2 py-1 text-[11px] font-bold text-[#176B4B]">
                    <ArrowUpIcon className="h-3 w-3" />
                    <bdi>{formatNumber(summary.deltaPercent, lang, 1)}%</bdi>
                    <span className="font-medium">{t.reports.delta}</span>
                  </span>
                </div>
                <p className="mt-3 flex flex-wrap items-baseline gap-2">
                  <bdi className="text-4xl font-black leading-none tracking-tight text-stone-800 tabular-nums sm:text-5xl">
                    {formatNumber(summary.revenue, lang)}
                  </bdi>
                  <span className="text-lg font-bold text-brand-600">{t.reports.currency}</span>
                </p>
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-stone-500">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {formatShortDate(summary.dateFrom, lang)} — {formatShortDate(summary.dateTo, lang)}
                </p>
              </div>

              <div className="grid w-full max-w-md grid-cols-3 divide-x divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm rtl:divide-x-reverse sm:w-auto">
                <HeroMetric icon={<ReceiptIcon className="h-4 w-4" />} iconClass="bg-brand-50 text-brand-600" label={t.reports.orders} value={formatNumber(summary.orders, lang)} />
                <HeroMetric icon={<CalendarIcon className="h-4 w-4" />} iconClass="bg-[#FBF1D8] text-[#806116]" label={t.reports.avgOrder} value={formatNumber(summary.averageOrder, lang, 1)} />
                <HeroMetric icon={<ChartIcon className="h-4 w-4" />} iconClass="bg-mint-100 text-[#176B4B]" label={t.reports.netProfit} value={formatNumber(summary.netProfit, lang)} />
              </div>
            </div>
          </section>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <section className="dashboard-panel p-4 sm:p-5">
              <CardHeader title={t.reports.paymentMethods} subtitle={t.reports.paymentSub} onMore={() => onToast(t.reports.paymentSub)} />
              <div className="mt-4">
                <PaymentDonut payments={summary.payments} t={t} lang={lang} />
              </div>
            </section>

            <section className="dashboard-panel p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-stone-800">{t.reports.peakHours}</h2>
                  <p className="mt-0.5 text-xs text-stone-500">{t.reports.peakSub}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-semibold text-stone-500">
                  <span className="h-2 w-2 rounded-full bg-brand-600" aria-hidden="true" />
                  {t.reports.peakLabel}
                </span>
              </div>
              <div className="mt-4">
                <PeakChart points={summary.peakHours} t={t} lang={lang} />
              </div>
            </section>

            <section className="dashboard-panel p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-stone-800">{t.reports.bestSellers}</h2>
                  <p className="mt-0.5 text-xs text-stone-500">{t.reports.bestSub}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onToast(t.reports.bestSub)}
                  className="shrink-0 text-xs font-bold text-brand-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
                >
                  {t.reports.viewAll}
                </button>
              </div>
              <BestSellers summary={summary} t={t} lang={lang} />
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

function HeroMetric({ icon, iconClass, label, value }: { icon: ReactNode; iconClass: string; label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-3">
      <div className="flex items-center gap-1.5">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${iconClass}`}>{icon}</span>
        <span className="truncate text-[11px] font-semibold text-stone-500">{label}</span>
      </div>
      <p className="mt-2 text-lg font-extrabold tabular-nums text-stone-800">
        <bdi>{value}</bdi>
      </p>
    </div>
  )
}

function CardHeader({ title, subtitle, onMore }: { title: string; subtitle: string; onMore: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-extrabold text-stone-800">{title}</h2>
        <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onMore}
        aria-label={title}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-stone-500 transition-colors hover:bg-cream-50 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
      >
        <MoreIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

function PaymentDonut({ payments, t, lang }: { payments: PaymentBreakdown[]; t: T; lang: Lang }) {
  let offset = 0
  const totalOperations = payments.reduce((sum, payment) => sum + payment.count, 0)

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#F2EAE0" strokeWidth="16" />
          {payments.map((payment) => {
            const circle = (
              <circle
                key={payment.key}
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke={PAYMENT_COLORS[payment.key]}
                strokeWidth="16"
                pathLength={100}
                strokeDasharray={`${payment.percentage} 100`}
                strokeDashoffset={-offset}
              />
            )
            offset += payment.percentage
            return circle
          })}
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="text-[11px] font-semibold text-stone-500">{t.reports.totalOperations}</span>
          <bdi className="text-xl font-extrabold tabular-nums text-stone-800">{formatNumber(totalOperations, lang)}</bdi>
        </div>
      </div>

      <ul className="w-full space-y-2.5">
        {payments.map((payment) => (
          <li key={payment.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="inline-flex items-center gap-2 font-bold text-stone-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PAYMENT_COLORS[payment.key] }} aria-hidden="true" />
              {t.reports.payment[payment.key]}
            </span>
            <span className="text-stone-500">
              {formatNumber(payment.count, lang)} {t.reports.totalOperations}
            </span>
            <bdi className="font-extrabold tabular-nums text-stone-800">{formatNumber(payment.percentage, lang)}%</bdi>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PeakChart({ points, t, lang }: { points: PeakHourPoint[]; t: T; lang: Lang }) {
  const width = 360
  const height = 200
  const padX = 8
  const padTop = 22
  const padBottom = 26
  const maxOrders = Math.max(...points.map((point) => point.orders), 1)
  const max = Math.ceil(maxOrders / 40) * 40
  const peak = Math.max(...points.map((point) => point.orders))
  const chartHeight = height - padTop - padBottom
  const stepX = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0
  const coords = points.map((point, index) => {
    const x = padX + index * stepX
    const y = padTop + (1 - point.orders / max) * chartHeight
    return [x, y] as const
  })
  const line = smoothPath(coords)
  const area = `${line} L${coords[coords.length - 1][0]},${height - padBottom} L${coords[0][0]},${height - padBottom} Z`
  const peakIndex = points.findIndex((point) => point.orders === peak)
  const [peakX, peakY] = coords[Math.max(peakIndex, 0)]
  const tooltipLeft = Math.min(86, Math.max(14, (peakX / width) * 100))
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => max * ratio)

  return (
    <div>
      <div className="flex gap-1.5">
        <div aria-hidden="true" className="relative w-8 shrink-0 text-end text-[10px] font-semibold text-stone-500 tabular-nums">
          {ticks.map((tick) => (
            <span key={tick} className="absolute inset-x-0 -translate-y-1/2" style={{ top: `${(padTop + (1 - tick / max) * chartHeight) / height * 100}%` }}>
              {formatNumber(tick, lang)}
            </span>
          ))}
        </div>
        <div className="relative h-44 min-w-0 flex-1">
          <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block h-full w-full" role="img" aria-label={t.reports.peakLabel}>
            <defs>
              <linearGradient id="peak-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C2281A" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#C2281A" stopOpacity="0.01" />
              </linearGradient>
            </defs>
            {ticks.map((tick) => (
              <line
                key={tick}
                x1={padX}
                x2={width - padX}
                y1={padTop + (1 - tick / max) * chartHeight}
                y2={padTop + (1 - tick / max) * chartHeight}
                stroke="#E9E1D7"
                strokeWidth="1"
                strokeDasharray={tick === 0 ? undefined : '3 5'}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={area} fill="url(#peak-area)" />
            <path d={line} fill="none" stroke="#C2281A" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <line x1={peakX} x2={peakX} y1={padTop} y2={height - padBottom} stroke="#D9B45A" strokeWidth="1" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
            <circle cx={peakX} cy={peakY} r="4" fill="#C2281A" stroke="#FFFFFF" strokeWidth="2" />
          </svg>

          <div
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg bg-stone-800 px-2.5 py-1 text-[10px] font-bold text-white shadow-soft"
            style={{ left: `${tooltipLeft}%`, top: `${(peakY / height) * 100}%`, transform: 'translate(-50%, calc(-100% - 8px))' }}
          >
            {t.reports.peakTooltip}
          </div>
        </div>
      </div>
      <div className="ms-[38px] flex justify-between text-[10px] font-semibold text-stone-500">
        {points
          .filter((_, index) => index % 2 === 0)
          .map((point) => (
            <span key={point.hour}>{hourLabel(point.hour, lang)}</span>
          ))}
      </div>
    </div>
  )
}

function BestSellers({ summary, t, lang }: { summary: ReportsSummary; t: T; lang: Lang }) {
  const maxUnits = summary.bestSellers[0]?.units || 1
  return (
    <ol className="mt-3 divide-y divide-line/70">
      {summary.bestSellers.map((seller, index) => {
        const percentage = Math.max(6, Math.round((seller.units / maxUnits) * 100))
        return (
          <li key={seller.id} className="py-3 first:pt-1 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-stone-800">{lang === 'ar' ? seller.nameAr : seller.nameEn}</p>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-stone-500">
                  <span>
                    {formatNumber(seller.units, lang)} {t.reports.units}
                  </span>
                  <span className="font-bold tabular-nums text-stone-700">{formatOrderTotal(seller.revenue, lang)}</span>
                </div>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cream-50 text-lg" aria-hidden="true">
                {seller.emoji}
              </span>
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${index === 0 ? 'bg-brand-600 text-white' : 'bg-cream-100 text-stone-500'}`}>
                {formatNumber(index + 1, lang)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-100">
              <span className={`block h-full rounded-full ${index === 0 ? 'bg-brand-600' : 'bg-[#F07A6E]'}`} style={{ width: `${percentage}%` }} />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
