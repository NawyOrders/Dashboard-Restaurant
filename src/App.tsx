import { useEffect, useState } from 'react'
import type { Lang } from './i18n'
import { translations } from './i18n'
import { BottomNav, MobileHeader, Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { StatCard } from './components/StatCard'
import { TopItems } from './components/TopItems'
import { SalesChart } from './components/SalesChart'
import { OrdersTable } from './components/OrdersTable'
import { BagIcon, CoinsIcon, StarIcon, UsersIcon } from './icons'

export default function App() {
  const [lang, setLang] = useState<Lang>('ar')
  const t = translations[lang]

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = t.dir
    document.title = `${t.brandName} — ${t.brandSub}`
  }, [lang, t])

  const stats = [
    {
      label: t.stats.salesToday,
      value: '12,480',
      suffix: t.chart.currency,
      delta: '12.5%',
      up: true,
      iconBg: 'bg-gradient-to-br from-gold-300 to-gold-500',
      icon: <CoinsIcon className="w-6 h-6 text-white" />,
      orderClass: 'order-2 xl:order-4',
    },
    {
      label: t.stats.newOrders,
      value: '148',
      delta: '8.2%',
      up: true,
      iconBg: 'bg-gradient-to-br from-brand-400 to-brand-700',
      icon: <BagIcon className="w-6 h-6 text-white" />,
      orderClass: 'order-1 xl:order-3',
    },
    {
      label: t.stats.employees,
      value: '326',
      delta: '4.1%',
      up: true,
      iconBg: 'bg-gradient-to-br from-brand-100 to-brand-100',
      icon: <UsersIcon className="w-6 h-6 text-brand-500" />,
      orderClass: 'order-4 xl:order-2',
    },
    {
      label: t.stats.avgOrder,
      value: '84',
      suffix: t.chart.currency,
      delta: '2.3%',
      up: false,
      iconBg: 'bg-gradient-to-br from-gold-300 to-gold-500',
      icon: <StarIcon className="w-6 h-6 text-white" />,
      orderClass: 'order-3 xl:order-1',
    },
  ]

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="flex">
        <Sidebar t={t} />

        <main className="flex-1 min-w-0 pb-28 lg:pb-10">
          <MobileHeader t={t} />

          <div className="lg:hidden px-6 mt-5">
            <h2 className="text-xl font-black text-brand-600">{t.greeting} 👋</h2>
            <p className="text-xs text-mint-600 font-semibold mt-1">{t.greetingSub}</p>
          </div>

          <Topbar t={t} onToggleLang={() => setLang(lang === 'ar' ? 'en' : 'ar')} />

          <div className="px-6 mt-6 grid grid-cols-2 xl:grid-cols-4 gap-4">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          <div className="px-6 mt-4 grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="order-2 lg:order-1 lg:col-span-2">
              <TopItems t={t} />
            </div>
            <div className="order-1 lg:order-2 lg:col-span-3">
              <SalesChart t={t} />
            </div>
          </div>

          <div className="px-6 mt-4">
            <OrdersTable t={t} />
          </div>
        </main>
      </div>

      <BottomNav t={t} />
    </div>
  )
}
