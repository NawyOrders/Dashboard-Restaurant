import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Lang } from './i18n'
import { translations } from './i18n'
import type { OrderRow, OrderStatus, Profile, SectionKey, StatKey } from './types'
import { filterOrders } from './orders'
import { BottomNav, MobileHeader, Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { StatCard } from './components/StatCard'
import { TopItems } from './components/TopItems'
import { SalesChart } from './components/SalesChart'
import { OrdersTable } from './components/OrdersTable'
import {
  GuideDialog,
  NotificationsDialog,
  OrderDetails,
  OrdersDialog,
  SettingsDialog,
  StatDetails,
  TopItemsDialog,
} from './components/Dialogs'
import { BagIcon, CheckIcon, CoinsIcon, StarIcon, UsersIcon } from './icons'

const PROFILE_KEY = 'karam-restaurant-profile'

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
}

type ModalState =
  | { type: 'order'; id: string }
  | { type: 'orders' }
  | { type: 'stat'; key: StatKey }
  | { type: 'topItems' }
  | { type: 'notifications' }
  | { type: 'settings' }
  | { type: 'guide' }
  | null

export default function App() {
  const [lang, setLang] = useState<Lang>('ar')
  const t = translations[lang]

  const [section, setSection] = useState<SectionKey>('home')
  const [isOpen, setIsOpen] = useState(true)
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [readNotifications, setReadNotifications] = useState<string[]>([])
  const [profile, setProfile] = useState<Profile>({})
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)

  const [statuses, setStatuses] = useState<Record<string, OrderStatus>>(() => {
    const entries = translations.ar.orders.rows.map((row) => [row.id, row.status as OrderStatus])
    return Object.fromEntries(entries) as Record<string, OrderStatus>
  })

  const brandName = profile.name?.trim() || t.brandName

  const orders = useMemo<OrderRow[]>(
    () =>
      t.orders.rows.map((row) => ({
        ...row,
        status: statuses[row.id] ?? (row.status as OrderStatus),
      })),
    [t, statuses],
  )

  const filteredOrders = useMemo(
    () => filterOrders(orders, statuses, query),
    [orders, statuses, query],
  )

  const newOrdersCount = orders.filter((order) => order.status === 'new').length
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
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const stats: Stat[] = [
    {
      key: 'salesToday',
      label: t.stats.salesToday,
      value: '12,480',
      suffix: t.chart.currency,
      delta: '12.5%',
      up: true,
      iconBg: 'bg-gradient-to-br from-gold-300 to-gold-500',
      icon: <CoinsIcon className="h-6 w-6 text-white" />,
      orderClass: 'order-2 xl:order-4',
    },
    {
      key: 'newOrders',
      label: t.stats.newOrders,
      value: '148',
      delta: '8.2%',
      up: true,
      iconBg: 'bg-gradient-to-br from-brand-400 to-brand-700',
      icon: <BagIcon className="h-6 w-6 text-white" />,
      orderClass: 'order-1 xl:order-3',
    },
    {
      key: 'employees',
      label: t.stats.employees,
      value: '326',
      delta: '4.1%',
      up: true,
      iconBg: 'bg-gradient-to-br from-brand-100 to-brand-100',
      icon: <UsersIcon className="h-6 w-6 text-brand-500" />,
      orderClass: 'order-4 xl:order-2',
    },
    {
      key: 'avgOrder',
      label: t.stats.avgOrder,
      value: '84',
      suffix: t.chart.currency,
      delta: '2.3%',
      up: false,
      iconBg: 'bg-gradient-to-br from-gold-300 to-gold-500',
      icon: <StarIcon className="h-6 w-6 text-white" />,
      orderClass: 'order-3 xl:order-1',
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

  return (
    <div className="min-h-screen overflow-x-clip bg-cream-50">
      <div className="flex">
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

        <main className="min-w-0 flex-1 pb-28 lg:pb-10">
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

          <div className="mt-5 px-4 sm:px-6 lg:hidden">
            <h2 className="text-xl font-black text-brand-600">{t.greeting} 👋</h2>
            <p className="mt-1 text-xs font-semibold text-mint-600">
              {isOpen ? t.greetingSub : t.greetingClosed}
            </p>
          </div>

          <Topbar
            t={t}
            query={query}
            unreadCount={unreadCount}
            isOpen={isOpen}
            onQueryChange={setQuery}
            onSearchSubmit={() => navigate('orders')}
            onToggleLang={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            onOpenNotifications={() => setModal({ type: 'notifications' })}
            onOpenGuide={() => setModal({ type: 'guide' })}
          />

          <div
            id="home"
            className="mt-6 grid scroll-mt-4 grid-cols-2 gap-3 px-4 sm:gap-4 sm:px-6 xl:grid-cols-4"
          >
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
                onClick={() => setModal({ type: 'stat', key: stat.key })}
                detailsLabel={t.actions.viewDetails}
              />
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 px-4 sm:px-6 lg:grid-cols-5">
            <div id="menu" className="order-2 scroll-mt-4 lg:order-1 lg:col-span-2">
              <TopItems t={t} onOpenDetails={() => setModal({ type: 'topItems' })} />
            </div>
            <div id="reports" className="order-1 scroll-mt-4 lg:order-2 lg:col-span-3">
              <SalesChart t={t} />
            </div>
          </div>

          <div id="orders" className="mt-4 scroll-mt-4 px-4 sm:px-6">
            <OrdersTable
              t={t}
              orders={filteredOrders}
              statuses={statuses}
              query={query}
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
