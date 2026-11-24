import { useEffect, useState, type ReactNode } from 'react'
import type { Api } from '../api'
import type { PaymentBreakdown, PaymentMethodKey, PeakHourPoint, ReportRange, ReportsSummary } from '../api/types'
import type { Lang, T } from '../i18n'
import { formatNumber, formatOrderTotal } from '../orders'
import { buildReportsCsv } from '../reports'
import { PageHeading } from '../components/PageHeading'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BagIcon,
  ChartIcon,
  CoinsIcon,
  DownloadIcon,
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
  cash: '#C2281A',
  instapay: '#D99A2B',
  wallet: '#1E9E6A',
}

function hourLabel(hour: number, lang: Lang): string {
  const display = hour % 12 === 0 ? 12 : hour % 12
  if (lang === 'ar') return `${display} ${hour < 12 ? 'ص' : 'م'}`
  return `${display} ${hour < 12 ? 'AM' : 'PM'}`
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-bold text-stone-700 transition-colors hover:bg-cream-50 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
            >
              <DownloadIcon className="h-4 w-4 text-brand-600" />
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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStat
              label={t.reports.revenue}
              value={formatNumber(summary.revenue, lang)}
              suffix={t.reports.currency}
              delta={`${formatNumber(summary.deltaPercent, lang, 1)}%`}
              deltaLabel={t.reports.delta}
              up
              icon={<CoinsIcon className="h-5 w-5" />}
              iconClass="bg-brand-50 text-brand-600"
              valueClass="text-brand-600"
            />
            <ReportStat
              label={t.reports.orders}
              value={formatNumber(summary.orders, lang)}
              suffix={t.reports.units}
              delta={`${formatNumber(summary.deltaPercent, lang, 1)}%`}
              deltaLabel={t.reports.delta}
              up
              icon={<BagIcon className="h-5 w-5" />}
              iconClass="bg-[#FBF1D8] text-[#806116]"
            />
            <ReportStat
              label={t.reports.avgOrder}
              value={formatNumber(summary.averageOrder, lang, 1)}
              suffix={t.reports.currency}
              delta={`${formatNumber(summary.deltaPercent, lang, 1)}%`}
              deltaLabel={t.reports.delta}
              up
              icon={<ReceiptIcon className="h-5 w-5" />}
              iconClass="bg-mint-100 text-[#176B4B]"
            />
            <ReportStat
              label={t.reports.netProfit}
              value={formatNumber(summary.netProfit, lang)}
              suffix={t.reports.currency}
              delta={`${formatNumber(summary.deltaPercent, lang, 1)}%`}
              deltaLabel={t.reports.delta}
              up
              icon={<ChartIcon className="h-5 w-5" />}
              iconClass="bg-cream-100 text-stone-600"
            />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <section className="dashboard-panel p-4 sm:p-5">
              <h2 className="text-base font-extrabold text-stone-800">{t.reports.paymentMethods}</h2>
              <p className="mt-0.5 text-xs text-stone-500">{t.reports.paymentSub}</p>
              <div className="mt-5">
                <PaymentDonut payments={summary.payments} t={t} lang={lang} />
              </div>
            </section>

            <section className="dashboard-panel p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-stone-800">{t.reports.peakHours}</h2>
                  <p className="mt-0.5 text-xs text-stone-500">{t.reports.peakSub}</p>
                </div>
                <span className="rounded-full bg-[#FBF1D8] px-2.5 py-1 text-[11px] font-bold text-[#806116]">{t.reports.peakTooltip}</span>
              </div>
              <div className="mt-5">
                <PeakChart points={summary.peakHours} t={t} lang={lang} />
              </div>
            </section>
          </div>

          <section className="dashboard-panel mt-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-extrabold text-stone-800">{t.reports.bestSellers}</h2>
                <p className="mt-0.5 text-xs text-stone-500">{t.reports.bestSub}</p>
              </div>
              <button
                type="button"
                onClick={() => onToast(t.reports.bestSub)}
                className="text-xs font-bold text-brand-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
              >
                {t.reports.viewAll}
              </button>
            </div>

            <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {summary.bestSellers.map((seller, index) => {
                const maxUnits = summary.bestSellers[0]?.units || 1
                const percentage = Math.max(4, Math.round((seller.units / maxUnits) * 100))
                return (
                  <li key={seller.id} className="min-w-0 rounded-xl border border-line bg-cream-50/60 p-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-lg shadow-sm" aria-hidden="true">
                        {seller.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold text-stone-800">
                          {lang === 'ar' ? seller.nameAr : seller.nameEn}
                        </span>
                        <span className="mt-0.5 block text-[11px] font-semibold tabular-nums text-stone-500">
                          {formatNumber(seller.units, lang)} {t.reports.units}
                        </span>
                      </span>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${index === 0 ? 'bg-brand-600 text-white' : 'bg-cream-100 text-stone-500'}`}>
                        {formatNumber(index + 1, lang)}
                      </span>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream-100">
                      <span className={`block h-full rounded-full ${index === 0 ? 'bg-brand-600' : 'bg-gold-400'}`} style={{ width: `${percentage}%` }} />
                    </div>
                    <p className="mt-1.5 text-[11px] font-semibold text-stone-500">
                      {t.reports.revenueShort}: <span className="tabular-nums text-stone-700">{formatOrderTotal(seller.revenue, lang)}</span>
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}

function ReportStat({ label, value, suffix, delta, deltaLabel, up, icon, iconClass, valueClass }: {
  label: string
  value: string
  suffix: string
  delta: string
  deltaLabel: string
  up: boolean
  icon: ReactNode
  iconClass: string
  valueClass?: string
}) {
  return (
    <div className="dashboard-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-stone-500">{label}</span>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${iconClass}`}>{icon}</span>
      </div>
      <p className="mt-3 flex flex-wrap items-baseline gap-1.5">
        <bdi className={`text-2xl font-extrabold tabular-nums ${valueClass ?? 'text-stone-800'}`}>{value}</bdi>
        <span className="text-xs font-semibold text-stone-500">{suffix}</span>
      </p>
      <p className={`mt-2 inline-flex items-center gap-1 text-xs font-bold ${up ? 'text-mint-600' : 'text-brand-600'}`}>
        {up ? <ArrowUpIcon className="h-3.5 w-3.5" /> : <ArrowDownIcon className="h-3.5 w-3.5" />}
        <bdi>{delta}</bdi>
        <span className="font-medium text-stone-500">{deltaLabel}</span>
      </p>
    </div>
  )
}

function PaymentDonut({ payments, t, lang }: { payments: PaymentBreakdown[]; t: T; lang: Lang }) {
  let offset = 0
  const totalOperations = payments.reduce((sum, payment) => sum + payment.count, 0)

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#F2EAE0" strokeWidth="14" />
          {payments.map((payment) => {
            const circle = (
              <circle
                key={payment.key}
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={PAYMENT_COLORS[payment.key]}
                strokeWidth="14"
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
          <bdi className="text-xl font-extrabold tabular-nums text-stone-800">{formatNumber(totalOperations, lang)}</bdi>
          <span className="text-[11px] font-semibold text-stone-500">{t.reports.totalOperations}</span>
        </div>
      </div>

      <ul className="flex min-w-[150px] flex-1 flex-col gap-3">
        {payments.map((payment) => (
          <li key={payment.key}>
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-2 font-bold text-stone-700">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PAYMENT_COLORS[payment.key] }} aria-hidden="true" />
                {t.reports.payment[payment.key]}
              </span>
              <bdi className="font-extrabold tabular-nums text-stone-700">{formatNumber(payment.percentage, lang)}%</bdi>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-100">
              <span className="block h-full rounded-full" style={{ width: `${payment.percentage}%`, background: PAYMENT_COLORS[payment.key] }} />
            </div>
            <p className="mt-1 text-[11px] text-stone-500">
              {formatNumber(payment.count, lang)} {t.reports.totalOperations}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PeakChart({ points, t, lang }: { points: PeakHourPoint[]; t: T; lang: Lang }) {
  const width = 360
  const height = 150
  const paddingX = 6
  const paddingY = 14
  const gap = 4
  const max = Math.max(...points.map((point) => point.orders), 1)
  const peak = Math.max(...points.map((point) => point.orders))
  const barWidth = (width - paddingX * 2 - gap * Math.max(points.length - 1, 0)) / Math.max(points.length, 1)
  const chartHeight = height - paddingY * 2

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-40 w-full" role="img" aria-label={t.reports.peakLabel}>
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={paddingX}
            x2={width - paddingX}
            y1={height - paddingY - chartHeight * ratio}
            y2={height - paddingY - chartHeight * ratio}
            stroke="#F2EAE0"
            strokeDasharray="3 4"
          />
        ))}
        {points.map((point, index) => {
          const barHeight = Math.max(3, (point.orders / max) * chartHeight)
          const x = paddingX + index * (barWidth + gap)
          const y = height - paddingY - barHeight
          const isPeak = point.orders === peak
          return (
            <rect
              key={`${point.hour}-${index}`}
              x={x}
              y={y}
              width={Math.max(barWidth, 2)}
              height={barHeight}
              rx="3"
              fill={isPeak ? '#D99A2B' : '#C2281A'}
              opacity={isPeak ? 1 : 0.72}
            />
          )
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] font-semibold text-stone-500">
        {points
          .filter((_, index) => index % 2 === 0)
          .map((point) => (
            <span key={point.hour}>{hourLabel(point.hour, lang)}</span>
          ))}
      </div>
    </div>
  )
}
