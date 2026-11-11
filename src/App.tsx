import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { Lang } from './i18n'
import { translations } from './i18n'
import type { Session } from './auth'
import { API_BASE_URL, clearLegacySession, revokeSession } from './auth'
import { createApi, isMockErrorRequested, isMockRequested } from './api'
import { useOrders } from './useOrders'
import { Login } from './components/Login'
import type { OrderRow, OrderStatus, Profile, SectionKey, StatKey } from './types'
import { filterOrders, formatNumber, orderTotalValue } from './orders'
import { formatFullDate, parseDateKey, startOfDay, toDateKey } from './calendar'
import { BottomNav, MobileHeader, Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { StatCard } from './components/StatCard'
import { TopItems } from './components/TopItems'
import { SalesChart } from './components/SalesChart'
import { OrdersTable } from './components/OrdersTable'
import { CalendarDialog } from './components/Calendar'
import {
  GuideDialog,
  NotificationsDialog,
  OrderDetails,
  OrdersDialog,
  SettingsDialog,
  StatDetails,
  TopItemsDialog,
} from './components/Dialogs'
import { ArrowLeftIcon, ArrowRightIcon, BagIcon, CalendarIcon, CheckIcon, CloseIcon, CoinsIcon, InfoIcon, StarIcon, UsersIcon } from './icons'

type Stat = {
  key: StatKey
  label: string
  value: string
  suffix?: string
  delta: string
  up: boolean
  iconBg: string
  icon: ReactNode
  orderClass: string
  spark: number[]
}

type ModalState =
  | { type: 'order'; id: string }
  | { type: 'orders' }
  | { type: 'stat'; key: StatKey }
  | { type: 'topItems' }
  | { type: 'notifications' }
  | { type: 'settings' }
  | { type: 'guide' }
  | { type: 'calendar' }
  | null

export default function App() {
  const [lang, setLang] = useState<Lang>('ar')
  const [session, setSession] = useState<Session | null>(null)
  const [notice, setNotice] = useState<'sessionExpired' | 'loggedOut' | 'revokeFailed' | null>(null)
  const sessionVersion = useRef(0)
  const t = translations[lang]

  useEffect(() => { clearLegacySession() }, [])

  // Direction applies to the login screen too, before any dashboard mounts.
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = t.dir
    if (!session) document.title = `${t.auth.welcome} — Nawy Orders`
  }, [lang, t, session])

  useEffect(() => {
    if (!session) return
    let timer: ReturnType<typeof setTimeout>
    const checkExpiry = () => {
      clearTimeout(timer)
      const remaining = session.expiresAt - Date.now()
      if (remaining <= 0) {
        sessionVersion.current += 1
        setSession(null)
        setNotice('sessionExpired')
        void revokeSession(session)
      } else {
        timer = setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647))
      }
    }
    checkExpiry()
    window.addEventListener('focus', checkExpiry)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', checkExpiry)
    }
  }, [session])

  const handleLogout = () => {
    if (!session) return
    const version = ++sessionVersion.current
    setSession(null)
    setNotice('loggedOut')
    void revokeSession(session).then((revoked) => {
      if (!revoked && version === sessionVersion.current) setNotice('revokeFailed')
    })
  }

  const handleSuccess = (next: Session) => {
    sessionVersion.current += 1
    setNotice(null)
    setSession(next)
  }

  return session ? (
    <Dashboard key={`${session.apiOrigin}:${session.user.id}`} session={session} lang={lang} setLang={setLang} onLogout={handleLogout} />
  ) : (
    <Login t={t} langToggle={t.nav.langToggle} onToggleLang={() => setLang((previous) => previous === 'ar' ? 'en' : 'ar')} onSuccess={handleSuccess} initialNotice={notice ? t.auth[notice] : undefined} />
  )
}

// The authenticated subtree has its own lifecycle. Logging out unmounts all
// dashboard hooks, open dialogs, searches and operational preview state.
function Dashboard({ session, lang, setLang, onLogout }: {
  session: Session
  lang: Lang
  setLang: Dispatch<SetStateAction<Lang>>
  onLogout: () => void
}) {
  const t = translations[lang]
  const PROFILE_KEY = `nawy-preview-profile:${session.apiOrigin}:${session.user.id}`
  const DATE_KEY = `nawy-preview-date:${session.apiOrigin}:${session.user.id}`
  const [section, setSection] = useState<SectionKey>('home')
  const [isOpen, setIsOpen] = useState(true)
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [readNotifications, setReadNotifications] = useState<string[]>([])
  const [profile, setProfile] = useState<Profile>({})
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [modeDismissed, setModeDismissed] = useState(false)
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)

  const search = typeof window === 'undefined' ? '' : window.location.search
  const mockMode = isMockRequested(search) || session.apiOrigin.startsWith('mock:')
  const api = useMemo(
    () =>
      mockMode
        ? createApi({
            baseUrl: API_BASE_URL,
            getAccessToken: () => session.accessToken,
            mock: true,
            mockError: isMockErrorRequested(search),
          })
        : null,
    [mockMode, search, session],
  )
  const remote = useOrders(api, lang)

  const [statuses, setStatuses] = useState<Record<string, OrderStatus>>(() => {
    if (api) return {}
    const entries = translations.ar.orders.rows.map((row) => [row.id, row.status as OrderStatus])
    return Object.fromEntries(entries) as Record<string, OrderStatus>
  })

  const brandName = profile.name?.trim() || t.brandName

  const baseRows = api ? remote.rows : t.orders.rows
  const orders = useMemo<OrderRow[]>(
    () =>
      baseRows.map((row) => ({
        ...row,
        status: statuses[row.id] ?? (row.status as OrderStatus),
      })),
    [baseRows, statuses],
  )

  const filteredOrders = useMemo(
    () => filterOrders(orders, statuses, query),
    [orders, statuses, query],
  )

  const newOrdersCount = orders.filter((order) => order.status === 'new').length
  const statusCounts = {
    new: newOrdersCount,
    preparing: orders.filter((order) => order.status === 'preparing').length,
    done: orders.filter((order) => order.status === 'done').length,
  }
  const totalOrders = orders.length
  const salesValue = orders.reduce((sum, order) => sum + orderTotalValue(order), 0)
  const averageValue = totalOrders > 0 ? salesValue / totalOrders : 0
  const customerCount = new Set(orders.map((order) => order.customer)).size
  const locale = t.dir === 'rtl' ? 'ar-EG' : 'en-US'
  const unreadCount = t.notifications.items.filter(
    (item) => item.unread && !readNotifications.includes(item.id),
  ).length

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = t.dir
    document.title = `${brandName} — ${t.brandSub}`
  }, [lang, t, brandName])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY)
      if (!raw) return
      const parsed: unknown = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object') return
      const record = parsed as Record<string, unknown>
      setProfile({
        name: typeof record.name === 'string' ? record.name : undefined,
        phone: typeof record.phone === 'string' ? record.phone : undefined,
        address: typeof record.address === 'string' ? record.address : undefined,
      })
    } catch {
      // Ignore unavailable or malformed storage.
    }
  }, [PROFILE_KEY])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DATE_KEY)
      if (!raw) return
      const parsed = parseDateKey(raw)
      if (parsed) setSelectedDate(parsed)
    } catch {
      // Ignore unavailable or malformed storage.
    }
  }, [DATE_KEY])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const stats: Stat[] = [
    {
      key: 'salesToday',
      label: t.stats.salesToday,
      value: formatNumber(salesValue, lang),
      suffix: t.chart.currency,
      delta: '12.5%',
      up: true,
      iconBg: 'bg-[#FBF1D8]',
      icon: <CoinsIcon className="h-5 w-5 text-[#806116]" />,
      orderClass: 'order-1',
      spark: [42, 58, 51, 67, 61, 74, 82],
    },
    {
      key: 'newOrders',
      label: t.stats.newOrders,
      value: formatNumber(newOrdersCount, lang),
      delta: '8.2%',
      up: true,
      iconBg: 'bg-brand-50',
      icon: <BagIcon className="h-5 w-5 text-brand-600" />,
      orderClass: 'order-2',
      spark: [18, 24, 21, 30, 27, 34, 38],
    },
    {
      key: 'employees',
      label: t.stats.employees,
      value: formatNumber(customerCount, lang),
      delta: '4.1%',
      up: true,
      iconBg: 'bg-mint-100',
      icon: <UsersIcon className="h-5 w-5 text-[#176B4B]" />,
      orderClass: 'order-3',
      spark: [12, 15, 14, 18, 17, 20, 22],
    },
    {
      key: 'avgOrder',
      label: t.stats.avgOrder,
      value: formatNumber(averageValue, lang),
      suffix: t.chart.currency,
      delta: '2.3%',
      up: false,
      iconBg: 'bg-cream-100',
      icon: <StarIcon className="h-5 w-5 text-[#806116]" />,
      orderClass: 'order-4',
      spark: [90, 86, 88, 84, 85, 83, 84],
    },
  ]

  const selectedOrder = modal?.type === 'order' ? orders.find((order) => order.id === modal.id) : undefined
  const selectedStat = modal?.type === 'stat' ? stats.find((stat) => stat.key === modal.key) : undefined

  const showToast = (message: string) => setToast({ id: Date.now(), message })

  const navigate = (key: SectionKey) => {
    setSection(key)
    if (key === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const toggleOpen = () => {
    const next = !isOpen
    setIsOpen(next)
    showToast(next ? `${t.nav.open} ✓` : `${t.nav.closed} ✓`)
  }

  const updateStatus = (id: string, status: OrderStatus) => {
    setStatuses((previous) => ({ ...previous, [id]: status }))
    showToast(t.actions.statusUpdated)
  }

  const markRead = (id: string) => {
    setReadNotifications((previous) => (previous.includes(id) ? previous : [...previous, id]))
  }

  const markAllRead = () => {
    setReadNotifications(t.notifications.items.map((item) => item.id))
    showToast(`${t.actions.markAllRead} ✓`)
  }

  const saveProfile = (next: Profile) => {
    setProfile(next)
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(next))
    } catch {
      // Storage can be unavailable in private mode; the UI still updates.
    }
    setModal(null)
    showToast(t.settings.saved)
  }

  const selectDate = (date: Date) => {
    const next = startOfDay(date)
    setSelectedDate(next)
    try {
      localStorage.setItem(DATE_KEY, toDateKey(next))
    } catch {
      // Storage can be unavailable in private mode; the UI still updates.
    }
    setModal(null)
    showToast(`${t.calendar.dateUpdated}: ${formatFullDate(next, t.dir === 'rtl' ? 'ar-EG' : 'en-US')}`)
  }

  const ForwardIcon = t.dir === 'rtl' ? ArrowLeftIcon : ArrowRightIcon

  return (
    <div className="dashboard-shell min-h-screen bg-cream-50">
      <a href="#dashboard-content" className="sr-only z-[70] rounded-lg bg-white p-3 font-bold text-brand-700 focus:not-sr-only focus:fixed focus:start-4 focus:top-4">
        {t.dashboard.skip}
      </a>
      <div className="flex items-start">
        <Sidebar
          t={t}
          active={section}
          isOpen={isOpen}
          brandName={brandName}
          brandSub={t.brandSub}
          orderBadge={newOrdersCount}
          unreadCount={unreadCount}
          onToggleOpen={toggleOpen}
          onNavigate={navigate}
          onOpenSettings={() => setModal({ type: 'settings' })}
        />

        <main id="dashboard-content" tabIndex={-1} className="dashboard-main min-w-0 flex-1 px-4 pt-4 pb-28 outline-none sm:px-6 sm:pt-6 lg:px-7 lg:pb-10 xl:px-8">
          <MobileHeader
            t={t}
            active={section}
            isOpen={isOpen}
            brandName={brandName}
            brandSub={t.brandSub}
            orderBadge={newOrdersCount}
            unreadCount={unreadCount}
            onToggleOpen={toggleOpen}
            onNavigate={navigate}
            onOpenSettings={() => setModal({ type: 'settings' })}
            onOpenNotifications={() => setModal({ type: 'notifications' })}
          />

          <Topbar
            t={t}
            user={session.user}
            query={query}
            unreadCount={unreadCount}
            selectedDate={selectedDate}
            onQueryChange={setQuery}
            onSearchSubmit={() => navigate('orders')}
            onToggleLang={() => setLang((previous) => previous === 'ar' ? 'en' : 'ar')}
            onLogout={onLogout}
            onOpenNotifications={() => setModal({ type: 'notifications' })}
            onOpenCalendar={() => setModal({ type: 'calendar' })}
            onOpenGuide={() => setModal({ type: 'guide' })}
          />

          <section className="dashboard-hero my-6 flex flex-col gap-5 p-5 sm:my-7 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="relative min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-600/10 px-2.5 py-1 text-[11px] font-bold text-brand-700">
                  <span className="relative flex h-2 w-2" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
                  </span>
                  {t.dashboard.live}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${isOpen ? 'bg-mint-100 text-[#176B4B]' : 'bg-cream-200 text-stone-600'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-mint-600' : 'bg-stone-400'}`} aria-hidden="true" />
                  {isOpen ? t.nav.open : t.nav.closed}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/70 px-2.5 py-1 text-[11px] font-bold text-stone-600">
                  <CalendarIcon className="h-3.5 w-3.5 text-brand-600" />
                  {formatFullDate(selectedDate, locale)}
                </span>
              </div>
              <p className="mb-1 text-xs font-bold text-brand-700"><bdi>{t.greeting}</bdi></p>
              <h1 className="text-2xl font-extrabold leading-snug text-stone-800 sm:text-3xl">{t.dashboard.overview}</h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-500">{isOpen ? t.greetingSub : t.greetingClosed}</p>
            </div>
            <div className="relative flex shrink-0 flex-wrap items-center gap-2">
              <button type="button" onClick={() => setModal({ type: 'orders' })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-lift transition-colors hover:bg-brand-700">
                {t.statDetails.viewOrders}<ForwardIcon className="h-4 w-4" />
              </button>
            </div>
          </section>

          {!modeDismissed && (
            <aside aria-label={api ? t.auth.mockTitle : t.auth.previewTitle} className="mb-5 flex items-start gap-3 rounded-2xl border border-gold-300/60 bg-gradient-to-r from-[#FBF1D8]/80 to-white px-4 py-3 text-stone-600 shadow-card">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#FBF1D8] text-[#806116]">
                <InfoIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#806116]">{api ? t.auth.mockTitle : t.auth.previewTitle}</p>
                <p className="mt-1 text-xs leading-relaxed">{api ? t.auth.mockHint : t.auth.previewHint}</p>
              </div>
              <button type="button" onClick={() => setModeDismissed(true)} aria-label={t.actions.close} title={t.actions.close} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-stone-500 transition-colors hover:bg-white hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-200">
                <CloseIcon className="h-4 w-4" />
              </button>
            </aside>
          )}

          <div id="home" className="grid scroll-mt-6 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard
                key={stat.key}
                label={stat.label}
                value={stat.value}
                suffix={stat.suffix}
                delta={stat.delta}
                up={stat.up}
                icon={stat.icon}
                iconBg={stat.iconBg}
                orderClass={stat.orderClass}
                spark={stat.spark}
                onClick={() => setModal({ type: 'stat', key: stat.key })}
                detailsLabel={t.actions.viewDetails}
              />
            ))}
          </div>

          <section aria-label={t.dashboard.queue} className="dashboard-panel mt-5 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xs font-bold text-stone-600">{t.dashboard.queue}</h2>
                <p className="mt-1 text-[11px] text-stone-500">{t.dashboard.queueHint}</p>
              </div>
              <span className="rounded-full bg-cream-100 px-2.5 py-1 text-[11px] font-bold tabular-nums text-stone-600">
                {formatNumber(totalOrders, lang)} {t.ordersDialog.results}
              </span>
            </div>
            <div aria-hidden="true" className="mt-3 flex h-2 overflow-hidden rounded-full bg-cream-100">
              {totalOrders > 0 ? (
                <>
                  <span className="h-full bg-brand-500" style={{ width: `${(statusCounts.new / totalOrders) * 100}%` }} />
                  <span className="h-full bg-gold-500" style={{ width: `${(statusCounts.preparing / totalOrders) * 100}%` }} />
                  <span className="h-full bg-mint-600" style={{ width: `${(statusCounts.done / totalOrders) * 100}%` }} />
                </>
              ) : null}
            </div>
            <dl className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              {(['new', 'preparing', 'done'] as const).map((status) => (
                <div key={status} className="flex items-center gap-2 text-sm">
                  <dt className="flex items-center gap-2 text-stone-500">
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${status === 'new' ? 'bg-brand-500' : status === 'preparing' ? 'bg-gold-500' : 'bg-mint-600'}`} />
                    {t.orders.status[status]}
                  </dt>
                  <dd className="font-bold tabular-nums text-stone-800">{statusCounts[status]}</dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-5">
            <div id="reports" className="scroll-mt-6 xl:col-span-3">
              <SalesChart t={t} />
            </div>
            <div id="menu" className="scroll-mt-6 xl:col-span-2">
              <TopItems t={t} onOpenDetails={() => setModal({ type: 'topItems' })} />
            </div>
          </div>

          <div id="orders" className="mt-5 scroll-mt-6">
            <OrdersTable
              t={t}
              orders={filteredOrders}
              statuses={statuses}
              query={query}
              state={api ? remote.state : 'ready'}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              onRetry={remote.reload}
              onRefresh={api ? remote.reload : undefined}
              onSelect={(order) => setModal({ type: 'order', id: order.id })}
              onViewAll={() => setModal({ type: 'orders' })}
            />
          </div>
        </main>
      </div>

      <BottomNav
        t={t}
        active={section}
        isOpen={isOpen}
        brandName={brandName}
        brandSub={t.brandSub}
        orderBadge={newOrdersCount}
        unreadCount={unreadCount}
        onToggleOpen={toggleOpen}
        onNavigate={navigate}
        onOpenSettings={() => setModal({ type: 'settings' })}
      />

      {modal?.type === 'order' && selectedOrder && (
        <OrderDetails
          t={t}
          order={selectedOrder}
          status={statuses[selectedOrder.id] ?? (selectedOrder.status as OrderStatus)}
          onClose={() => setModal(null)}
          onUpdateStatus={(status) => updateStatus(selectedOrder.id, status)}
        />
      )}

      {modal?.type === 'orders' && (
        <OrdersDialog
          t={t}
          rows={orders}
          statuses={statuses}
          initialQuery={query}
          onClose={() => setModal(null)}
          onSelect={(order) => setModal({ type: 'order', id: order.id })}
        />
      )}

      {modal?.type === 'stat' && selectedStat && (
        <StatDetails
          t={t}
          stat={selectedStat}
          onClose={() => setModal(null)}
          onViewOrders={() => setModal({ type: 'orders' })}
        />
      )}

      {modal?.type === 'topItems' && (
        <TopItemsDialog t={t} items={t.topItems.items} onClose={() => setModal(null)} />
      )}

      {modal?.type === 'notifications' && (
        <NotificationsDialog
          t={t}
          readIds={readNotifications}
          onClose={() => setModal(null)}
          onMarkAllRead={markAllRead}
          onMarkRead={markRead}
        />
      )}

      {modal?.type === 'settings' && (
        <SettingsDialog
          t={t}
          lang={lang}
          isOpen={isOpen}
          profile={profile}
          onClose={() => setModal(null)}
          onToggleOpen={toggleOpen}
          onLangChange={setLang}
          onSave={saveProfile}
        />
      )}

      {modal?.type === 'guide' && <GuideDialog t={t} onClose={() => setModal(null)} />}

      {modal?.type === 'calendar' && (
        <CalendarDialog
          t={t}
          selectedDate={selectedDate}
          onSelect={selectDate}
          onClose={() => setModal(null)}
        />
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-6"
        >
          <div
            key={toast.id}
            className="flex animate-toast-in items-center gap-2 rounded-full bg-stone-800 px-4 py-2.5 text-sm font-bold text-white shadow-soft"
          >
            <CheckIcon className="h-4 w-4 text-mint-100" />
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}
