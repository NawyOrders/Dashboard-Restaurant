import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import type { Lang } from './i18n'
import { translations } from './i18n'
import type { Session } from './auth'
import { canAny } from './authz'
import { MANAGE_MODULES } from './manage/modules'
import { manageCopy } from './manage/text'
import { API_BASE_URL, clearLegacySession, refreshSession, revokeSession } from './auth'
import { createApi, isMockErrorRequested, isMockRequested } from './api'
import type { OrdersHubConfig } from './realtime/ordersHub'
import { useOrders } from './useOrders'
import { Login } from './components/Login'
import { SetPassword, SET_PASSWORD_PATH } from './components/SetPassword'
import type { SectionKey } from './types'
import { filterOrders } from './orders'
import { MobileDrawer, MobileHeader, Sidebar } from './components/Sidebar'
import { MenuSectionTabs } from './components/MenuSectionTabs'
import { SettingsAdminLinks } from './components/SettingsAdminLinks'
import { Topbar } from './components/Topbar'
import { NO_BRAND, useBranding } from './useBranding'
import { BrandContext } from './brandContext'
import { applyTheme, saveThemeCache } from './theme'
import { applyFavicon, faviconHref } from './favicon'
import { CheckIcon, CloseIcon, InfoIcon, SpinnerIcon } from './icons'

const HomePage = lazy(() => import('./pages/HomePage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const MenuPage = lazy(() => import('./pages/MenuPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ManagePage = lazy(() => import('./pages/ManagePage'))
const OffersPage = lazy(() => import('./pages/OffersPage'))
const BranchesPage = lazy(() => import('./pages/BranchesPage'))
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'))
const StaffPage = lazy(() => import('./pages/StaffPage'))
const RolesPage = lazy(() => import('./pages/RolesPage'))
const CategoriesPage = lazy(() => import('./pages/CategoriesPage'))
const MenuItemsPage = lazy(() => import('./pages/MenuItemsPage'))
const AddOnsPage = lazy(() => import('./pages/AddOnsPage'))

const PATH_BY_SECTION: Record<SectionKey, string> = {
  home: '/',
  orders: '/orders',
  menu: '/menu',
  reports: '/reports',
  settings: '/settings',
}

// Management pages used day to day, shown directly in the sidebar.
const QUICK_MANAGE_PATHS = ['/manage/menu-items', '/manage/offers', '/manage/staff']

function sectionFromPath(pathname: string): SectionKey {
  if (pathname.startsWith('/orders')) return 'orders'
  if (pathname.startsWith('/menu')) return 'menu'
  if (pathname.startsWith('/reports')) return 'reports'
  if (pathname.startsWith('/settings') || pathname.startsWith('/manage')) return 'settings'
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
    const version = sessionVersion.current
    const signOutExpired = () => {
      if (sessionVersion.current !== version) return
      sessionVersion.current += 1
      setSession(null)
      setNotice('sessionExpired')
      void revokeSession(session)
    }
    const checkExpiry = () => {
      clearTimeout(timer)
      const remaining = session.expiresAt - Date.now()
      if (remaining <= 0) {
        if (!session.refreshToken) {
          signOutExpired()
          return
        }
        // Rotate the session instead of forcing a new login. Refresh tokens are
        // single-use: a failed or compromised rotation ends the session.
        void refreshSession(session).then((next) => {
          if (sessionVersion.current !== version) return
          setSession({ ...session, ...next })
        }, signOutExpired)
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
      ) : typeof window !== 'undefined' && window.location.pathname === SET_PASSWORD_PATH ? (
        <SetPassword
          lang={lang}
          onToggleLang={() => setLang((previous) => previous === 'ar' ? 'en' : 'ar')}
          onDone={() => window.location.assign('/')}
        />
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
  const branding = useBranding(remoteApi, lang)
  const brandName = branding.name ?? t.brandName
  const brandLogoUrl = branding.logoUrl
  const brandInfo = useMemo(() => ({ logoUrl: brandLogoUrl, name: brandName }), [brandLogoUrl, brandName])
  const settingsStorageKey = `nawy-preview-settings:${session.apiOrigin}:${session.user.id}`

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = t.dir
    document.title = `${brandName} — ${t.brandSub}`
  }, [lang, t, brandName])

  useEffect(() => {
    // NO_BRAND means branding has not loaded: keep whatever was painted from the cache.
    if (branding === NO_BRAND) return
    applyTheme(document.documentElement, branding.theme)
    saveThemeCache(window.localStorage, window.location.host, branding.theme)
  }, [branding])

  useEffect(() => {
    applyFavicon(document, faviconHref(branding.name, branding.logoUrl))
  }, [branding.name, branding.logoUrl])

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

  const quickLinks = QUICK_MANAGE_PATHS.flatMap((path) => {
    const module = MANAGE_MODULES.find((item) => item.path === path)
    return module && canAny(session.user.permissions, ...module.permissions) ? [{ path, label: module.title(lang), alsoActiveOn: path === '/manage/menu-items' ? ['/manage/categories', '/manage/addons'] : [] }] : []
  })
  const quickNav = {
    quickLinks,
    quickLinksLabel: manageCopy[lang].hubTitle,
    currentPath: location.pathname,
    onNavigatePath: (path: string) => { navigate(path); window.scrollTo({ top: 0, behavior: 'smooth' }) },
  }

  const menuTabs = (
    <MenuSectionTabs
      lang={lang}
      permissions={session.user.permissions}
      currentPath={location.pathname}
      onNavigate={quickNav.onNavigatePath}
      label={manageCopy[lang].items.title}
    />
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const toggleOpen = () => {
    const next = !isOpen
    setIsOpen(next)
    showToast(next ? `${t.nav.open} ✓` : `${t.nav.closed} ✓`)
  }

  return (
    <BrandContext.Provider value={brandInfo}>
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
          brandLogoUrl={brandLogoUrl}
          brandSub={t.brandSub}
          orderBadge={t.nav.ordersBadge}
          unreadCount={unreadCount}
          onToggleOpen={toggleOpen}
          onNavigate={navigateSection}
          {...quickNav}
        />

        <main id="dashboard-content" tabIndex={-1} className="dashboard-main min-w-0 flex-1 px-4 pt-4 pb-10 outline-none sm:px-6 sm:pt-6 lg:px-7 lg:pb-10 xl:px-8">
          <MobileHeader
            t={t}
            active={section}
            isOpen={isOpen}
            brandName={brandName}
            brandLogoUrl={brandLogoUrl}
            brandSub={t.brandSub}
            orderBadge={t.nav.ordersBadge}
            unreadCount={unreadCount}
            onToggleOpen={toggleOpen}
            onNavigate={navigateSection}
            onOpenNotifications={() => showToast(t.notifications.subtitle)}
            menuOpen={drawerOpen}
            onOpenMenu={() => setDrawerOpen((previous) => !previous)}
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
            <aside aria-label={api ? t.auth.mockTitle : t.auth.previewTitle} className="mt-4 flex items-start gap-3 rounded-2xl border border-gold-300/60 bg-gradient-to-r from-gold-50/80 to-white px-4 py-3 text-stone-600 shadow-card">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-50 text-gold-800">
                <InfoIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gold-800">{api ? t.auth.mockTitle : t.auth.previewTitle}</p>
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
                      api={remoteApi}
                      state={api ? remote.state : 'ready'}
                      query={query}
                      onRetry={remote.reload}
                      onViewAll={() => navigateSection('orders')}
                      onToast={showToast}
                    />
                  }
                />
                <Route path="/orders" element={<OrdersPage t={t} lang={lang} api={remoteApi ?? featureApi} ordersHub={ordersHub} permissions={session.user.permissions} onToast={showToast} />} />
                <Route path="/menu" element={<MenuPage t={t} lang={lang} api={remoteApi ?? featureApi} onToast={showToast} />} />
                <Route path="/reports" element={<ReportsPage t={t} lang={lang} api={remoteApi ?? featureApi} onToast={showToast} />} />
                <Route path="/settings" element={<SettingsPage t={t} lang={lang} storageKey={settingsStorageKey} onToast={showToast} adminLinks={<SettingsAdminLinks lang={lang} dir={t.dir} permissions={session.user.permissions} onNavigate={quickNav.onNavigatePath} />} onOpenManage={canAny(session.user.permissions, ...MANAGE_MODULES.flatMap((module) => module.permissions)) ? () => navigate('/manage') : undefined} />} />
                <Route path="/manage" element={<ManagePage lang={lang} dir={t.dir} permissions={session.user.permissions} />} />
                <Route path="/manage/offers" element={<OffersPage t={t} lang={lang} api={remoteApi ?? featureApi} permissions={session.user.permissions} uploadsEnabled={Boolean(remoteApi)} onToast={showToast} />} />
                <Route path="/manage/branches" element={<BranchesPage t={t} lang={lang} api={remoteApi ?? featureApi} permissions={session.user.permissions} onToast={showToast} />} />
                <Route path="/manage/payments" element={<PaymentsPage t={t} lang={lang} api={remoteApi ?? featureApi} permissions={session.user.permissions} onToast={showToast} />} />
                <Route path="/manage/staff" element={<StaffPage t={t} lang={lang} api={remoteApi ?? featureApi} permissions={session.user.permissions} onToast={showToast} />} />
                <Route path="/manage/roles" element={<RolesPage t={t} lang={lang} api={remoteApi ?? featureApi} permissions={session.user.permissions} onToast={showToast} />} />
                <Route path="/manage/categories" element={<>{menuTabs}<CategoriesPage t={t} lang={lang} api={remoteApi ?? featureApi} permissions={session.user.permissions} onToast={showToast} /></>} />
                <Route path="/manage/menu-items" element={<>{menuTabs}<MenuItemsPage t={t} lang={lang} api={remoteApi ?? featureApi} permissions={session.user.permissions} uploadsEnabled={Boolean(remoteApi)} onToast={showToast} /></>} />
                <Route path="/manage/addons" element={<>{menuTabs}<AddOnsPage t={t} lang={lang} api={remoteApi ?? featureApi} permissions={session.user.permissions} onToast={showToast} /></>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </main>
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        t={t}
        active={section}
        isOpen={isOpen}
        brandName={brandName}
        brandLogoUrl={brandLogoUrl}
        brandSub={t.brandSub}
        orderBadge={t.nav.ordersBadge}
        unreadCount={unreadCount}
        onToggleOpen={toggleOpen}
        onNavigate={navigateSection}
        {...quickNav}
      />

      {toast && (
        <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
          <div key={toast.id} className="flex animate-toast-in items-center gap-2 rounded-full bg-stone-800 px-4 py-2.5 text-sm font-bold text-white shadow-soft">
            <CheckIcon className="h-4 w-4 text-mint-100" />
            {toast.message}
          </div>
        </div>
      )}
    </div>
    </BrandContext.Provider>
  )
}
