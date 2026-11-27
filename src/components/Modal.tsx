import { useEffect, useId, useRef, type ReactNode } from 'react'
import { CloseIcon } from '../icons'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  closeLabel: string
  children: ReactNode
  footer?: ReactNode
  icon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const sizes: Record<NonNullable<Props['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
}

export function Modal({ open, onClose, title, subtitle, closeLabel, children, footer, icon, size = 'md' }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  const subtitleId = useId()
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="presentation" data-modal-root>
      <div
        className="absolute inset-0 animate-fade-in bg-ink-900/55 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        className={`relative flex max-h-[92dvh] w-full animate-sheet-in flex-col overflow-hidden rounded-t-[32px] bg-white shadow-[0_30px_80px_-20px_rgba(48,43,40,0.5)] ring-1 ring-ink-900/10 sm:max-h-[88dvh] sm:animate-modal-in sm:rounded-[32px] ${sizes[size]}`}
      >
        <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 px-5 pb-9 pt-3 text-white sm:px-8 sm:pb-10 sm:pt-7" data-modal-header>
          <div className="pointer-events-none absolute -top-14 h-48 w-48 rounded-full bg-gold-300/30 blur-2xl [inset-inline-end:-2rem]" aria-hidden="true" data-modal-glow />
          <div className="pointer-events-none absolute -bottom-16 h-40 w-40 rounded-full border-[18px] border-white/10 [inset-inline-start:-2.5rem]" aria-hidden="true" />
          <div className="pointer-events-none absolute top-6 h-24 w-24 rounded-full border-[10px] border-white/10 [inset-inline-end:30%]" aria-hidden="true" />
          <div className="relative mb-3 flex justify-center sm:hidden" aria-hidden="true" data-modal-handle>
            <span className="h-1.5 w-11 rounded-full bg-white/40" />
          </div>
          <div className="relative flex items-start gap-4">
            {icon && (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 text-brand-700 shadow-lg ring-4 ring-white/20" aria-hidden="true" data-modal-icon>
                {icon}
              </span>
            )}
            <div className="min-w-0 flex-1 pt-0.5">
              <h2 id={titleId} className="text-xl font-black leading-snug tracking-tight sm:text-2xl">
                {title}
              </h2>
              {subtitle && <p id={subtitleId} className="mt-1 text-sm leading-relaxed text-white/80 sm:text-[15px]">{subtitle}</p>}
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              title={closeLabel}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-300 to-transparent" aria-hidden="true" data-modal-accent />
        </div>

        <div className="relative -mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-t-[28px] bg-white px-5 pb-6 pt-6 sm:px-8 sm:pb-7">{children}</div>

        {footer && (
          <div data-modal-footer className="border-t border-line bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_24px_-18px_rgba(48,43,40,0.25)] sm:px-8 sm:py-5">{footer}</div>
        )}
      </div>
    </div>
  )
}
