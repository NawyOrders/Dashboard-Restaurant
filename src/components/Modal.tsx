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
  size?: 'sm' | 'md' | 'lg'
}

const sizes: Record<NonNullable<Props['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
}

export function Modal({ open, onClose, title, subtitle, closeLabel, children, footer, size = 'md' }: Props) {
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
        className="absolute inset-0 animate-fade-in bg-ink-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        className={`relative flex max-h-[92dvh] w-full animate-sheet-in flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl ring-1 ring-ink-900/10 sm:max-h-[88dvh] sm:animate-modal-in sm:rounded-3xl ${sizes[size]}`}
      >
        <div className="hidden h-1 bg-gradient-to-r from-gold-300 via-gold-400 to-gold-300 sm:block" aria-hidden="true" data-modal-accent />
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true" data-modal-handle>
          <span className="h-1.5 w-10 rounded-full bg-cream-300" />
        </div>
        <div className="flex items-start gap-3 border-b border-line bg-white px-5 pb-4 pt-3 sm:px-7 sm:py-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-black leading-snug tracking-tight text-ink-900 sm:text-xl">
              {title}
            </h2>
            {subtitle && <p id={subtitleId} className="mt-1 text-sm leading-relaxed text-ink-500">{subtitle}</p>}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-white text-stone-500 transition-colors hover:bg-cream-100 hover:text-stone-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7 sm:py-6">{children}</div>

        {footer && (
          <div data-modal-footer className="border-t border-line bg-surface-muted px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3.5 sm:px-7 sm:py-4">{footer}</div>
        )}
      </div>
    </div>
  )
}
