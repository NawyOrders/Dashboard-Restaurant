import { useState } from 'react'
import type { T } from '../i18n'
import {
  addMonths,
  buildMonthGrid,
  formatFullDate,
  formatMonthYear,
  isSameDay,
  weekdayLabels,
} from '../calendar'
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon, CheckIcon } from '../icons'
import { Modal } from './Modal'

const primaryButton =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300'
const secondaryButton =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-cream-100 px-4 py-2.5 text-sm font-bold text-stone-600 transition-colors hover:bg-cream-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200'

type Props = {
  t: T
  selectedDate: Date
  onSelect: (date: Date) => void
  onClose: () => void
}

export function CalendarDialog({ t, selectedDate, onSelect, onClose }: Props) {
  const locale = t.dir === 'rtl' ? 'ar-EG' : 'en-US'
  const weekStartsOn = t.dir === 'rtl' ? 6 : 0
  const [viewDate, setViewDate] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
  )
  const today = new Date()
  const cells = buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth(), weekStartsOn)
  const weekdays = weekdayLabels(locale, weekStartsOn)
  const PrevIcon = t.dir === 'rtl' ? ArrowRightIcon : ArrowLeftIcon
  const NextIcon = t.dir === 'rtl' ? ArrowLeftIcon : ArrowRightIcon
  const monthLabel = formatMonthYear(viewDate, locale)

  return (
    <Modal
      open
      onClose={onClose}
      closeLabel={t.actions.close}
      title={t.calendar.title}
      subtitle={t.calendar.subtitle}
      size="sm"
      footer={
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => onSelect(new Date())} className={primaryButton}>
            <CalendarIcon className="h-4 w-4" />
            {t.calendar.today}
          </button>
          <button type="button" onClick={onClose} className={secondaryButton}>
            {t.actions.close}
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-2 rounded-xl bg-cream-50 px-3 py-2">
        <CheckIcon className="h-4 w-4 shrink-0 text-brand-500" />
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-stone-600">
          {formatFullDate(selectedDate, locale)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2">
        <button
          type="button"
          onClick={() => setViewDate((current) => addMonths(current, -1))}
          aria-label={t.calendar.previousMonth}
          title={t.calendar.previousMonth}
          className="grid h-10 w-10 place-items-center rounded-xl bg-cream-50 text-stone-500 transition-colors hover:bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <PrevIcon className="h-5 w-5" />
        </button>
        <div className="min-w-0 text-center" aria-live="polite">
          <p className="truncate text-sm font-extrabold text-stone-800">{monthLabel}</p>
          <p className="text-[11px] font-semibold text-stone-400">{t.calendar.selectDate}</p>
        </div>
        <button
          type="button"
          onClick={() => setViewDate((current) => addMonths(current, 1))}
          aria-label={t.calendar.nextMonth}
          title={t.calendar.nextMonth}
          className="ms-auto grid h-10 w-10 place-items-center rounded-xl bg-cream-50 text-stone-500 transition-colors hover:bg-cream-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        >
          <NextIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1">
        {weekdays.map((weekday) => (
          <span
            key={weekday}
            className="py-1 text-center text-[10px] font-bold uppercase tracking-wide text-stone-400"
            aria-hidden="true"
          >
            {weekday}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const selected = isSameDay(cell, selectedDate)
          const isToday = isSameDay(cell, today)
          const outside = cell.getMonth() !== viewDate.getMonth()
          return (
            <button
              key={cell.toISOString()}
              type="button"
              onClick={() => onSelect(cell)}
              aria-label={formatFullDate(cell, locale)}
              aria-pressed={selected}
              aria-current={isToday ? 'date' : undefined}
              title={formatFullDate(cell, locale)}
              className={`relative flex h-10 w-full items-center justify-center rounded-xl text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 ${
                selected
                  ? 'bg-brand-600 text-white shadow'
                  : isToday
                    ? 'bg-cream-100 text-brand-600 ring-1 ring-brand-200 hover:bg-cream-200'
                    : outside
                      ? 'text-stone-300 hover:bg-cream-50'
                      : 'text-stone-600 hover:bg-cream-100'
              }`}
            >
              {cell.getDate()}
              {isToday && !selected && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-500" aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
