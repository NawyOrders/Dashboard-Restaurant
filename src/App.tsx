import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import type { Lang } from './i18n'
import { translations } from './i18n'
import type { Session } from './auth'
import { API_BASE_URL, clearLegacySession, revokeSession } from './auth'
import { createApi, isMockErrorRequested, isMockRequested } from './api'
import type { OrdersHubConfig } from './realtime/ordersHub'
import { useOrders } from './useOrders'
import { Login } from './components/Login'
import type { SectionKey } from './types'
import { filterOrders } from './orders'
import { BottomNav, MobileHeader, Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { CheckIcon, CloseIcon, InfoIcon, SpinnerIcon } from './icons'

const HomePage = lazy(() => import('./pages/HomePage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const MenuPage = lazy(() => import('./pages/MenuPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

const PATH_BY_SECTION: Record<SectionKey, string> = {
  home: '/',
  orders: '/orders',
  menu: '/menu',
  reports: '/reports',
  settings: '/settings',
}

function sectionFromPath(pathname: string): SectionKey {
  if (pathname.startsWith('/orders')) return 'orders'
  if (pathname.startsWith('/menu')) return 'menu'
  if (pathname.startsWith('/reports')) return 'reports'
  if (pathname.startsWith('/settings')) return 'settings'
  return 'home'
}

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

  return (
    <BrowserRouter>
      {session ? (
        <Dashboard key={`${session.apiOrigin}:${session.user.id}`} session={session} lang={lang} setLang={setLang} onLogout={handleLogout} />
      ) : (
        <Login t={t} langToggle={t.nav.langToggle} onToggleLang={() => setLang((previous) => previous === 'ar' ? 'en' : 'ar')} onSuccess={handleSuccess} initialNotice={notice ? t.auth[notice] : undefined} />
      )}
    </BrowserRouter>
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
  const navigate = useNavigate()
  const location = useLocation()
  const section = sectionFromPath(location.pathname)
  const [isOpen, setIsOpen] = useState(true)
  const [query, setQuery] = useState('')
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
  // The orders board runs on the real API outside mock mode; pages whose
  // endpoints are not confirmed yet keep the local preview adapter.
  const remoteApi = useMemo(
    () =>
      mockMode
        ? null
        : createApi({
            baseUrl: API_BASE_URL,
            getAccessToken: () => session.accessToken,
            mock: false,
          }),
    [mockMode, session],
  )
  // Live order push settings; the connection itself opens only while the
  // orders board is mounted (see useOrdersHub).
  const ordersHub = useMemo<OrdersHubConfig | null>(
    () =>
      remoteApi
        ? { baseUrl: API_BASE_URL, getAccessToken: () => session.accessToken }
        : null,
    [remoteApi, session],
  )
  // Preview pages use the local adapter until their endpoints are confirmed.
  const featureApi = useMemo(
    () =>
      api ??
      createApi({
        baseUrl: API_BASE_URL,
        getAccessToken: () => session.accessToken,
        mock: true,
        mockError: false,
        mockLatencyMs: 220,
      }),
    [api, session],
  )

  const remote = useOrders(api, lang)
  const baseRows = api ? remote.rows : t.orders.rows
  const orders = useMemo(() => baseRows.map((row) => ({ ...row })), [baseRows])
  const filteredOrders = useMemo(() => filterOrders(orders, {}, query), [orders, query])
  const unreadCount = t.notifications.items.filter((item) => item.unread).length
  const brandName = t.brandName
  const settingsStorageKey = `nawy-preview-settings:${session.apiOrigin}:${session.user.id}`

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = t.dir
    document.title = `${brandName} — ${t.brandSub}`
  }, [lang, t, brandName])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const showToast = useCallback((message: string) => setToast({ id: Date.now(), message }), [])

  const navigateSection = useCallback((key: SectionKey) => {
    navigate(PATH_BY_SECTION[key])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [navigate])

  const toggleOpen = () => {
    const next = !isOpen
    setIsOpen(next)
    showToast(next ? `${t.nav.open} ✓` : `${t.nav.closed} ✓`)
  }

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
          orderBadge={t.nav.ordersBadge}
          unreadCount={unreadCount}
          onToggleOpen={toggleOpen}
          onNavigate={navigateSection}
        />

        <main id="dashboard-content" tabIndex={-1} className="dashboard-main min-w-0 flex-1 px-4 pt-4 pb-28 outline-none sm:px-6 sm:pt-6 lg:px-7 lg:pb-10 xl:px-8">
          <MobileHeader
            t={t}
            active={section}
            isOpen={isOpen}
            brandName={brandName}
            brandSub={t.brandSub}
            orderBadge={t.nav.ordersBadge}
            unreadCount={unreadCount}
            onToggleOpen={toggleOpen}
            onNavigate={navigateSection}
            onOpenNotifications={() => showToast(t.notifications.subtitle)}
          />

          <Topbar
            t={t}
            user={session.user}
            active={section}
            isOpen={isOpen}
            brandName={brandName}
            query={query}
            unreadCount={unreadCount}
            selectedDate={new Date()}
            onQueryChange={setQuery}
            onSearchSubmit={() => navigateSection('home')}
            onToggleLang={() => setLang((previous) => previous === 'ar' ? 'en' : 'ar')}
            onLogout={onLogout}
            onOpenNotifications={() => showToast(t.notifications.subtitle)}
          />

          {!modeDismissed && (
            <aside aria-label={api ? t.auth.mockTitle : t.auth.previewTitle} className="mt-4 flex items-start gap-3 rounded-2xl border border-gold-300/60 bg-gradient-to-r from-[#FBF1D8]/80 to-white px-4 py-3 text-stone-600 shadow-card">
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

          <div className="mt-5">
            <Suspense
              fallback={
                <div role="status" aria-live="polite" className="dashboard-panel flex items-center gap-3 p-6 text-sm font-semibold text-stone-500">
                  <SpinnerIcon className="h-5 w-5 text-brand-600" />
                  {t.dashboard.loadingPage}
                </div>
              }
            >
              <Routes>
                <Route
                  path="/"
                  element={
                    <HomePage
                      t={t}
                      lang={lang}
                      orders={filteredOrders}
                      state={api ? remote.state : 'ready'}
                      query={query}
                      onRetry={remote.reload}
                      onViewAll={() => navigateSection('orders')}
                      onToast={showToast}
                    />
                  }
                />
                <Route path="/orders" element={<OrdersPage t={t} lang={lang} api={remoteApi ?? featureApi} ordersHub={ordersHub} permissions={session.user.permissions} onToast={showToast} />} />
                <Route path="/menu" element={<MenuPage t={t} lang={lang} api={featureApi} onToast={showToast} />} />
                <Route path="/reports" element={<ReportsPage t={t} lang={lang} api={featureApi} onToast={showToast} />} />
                <Route path="/settings" element={<SettingsPage t={t} lang={lang} storageKey={settingsStorageKey} onToast={showToast} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>

      <BottomNav
        t={t}
        active={section}
        isOpen={isOpen}
        brandName={brandName}
        brandSub={t.brandSub}
        orderBadge={t.nav.ordersBadge}
        unreadCount={unreadCount}
        onToggleOpen={toggleOpen}
        onNavigate={navigateSection}
      />

      {toast && (
        <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-6">
          <div key={toast.id} className="flex animate-toast-in items-center gap-2 rounded-full bg-stone-800 px-4 py-2.5 text-sm font-bold text-white shadow-soft">
            <CheckIcon className="h-4 w-4 text-mint-100" />
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}
