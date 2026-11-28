import { createRoot } from 'react-dom/client'
import './index.css'
import { translations } from './i18n'
import { AudioLockBanner } from './components/AudioLockBanner'
const t = translations.ar
createRoot(document.getElementById('root')!).render(<div className="min-h-screen bg-cream-50 p-10 pt-16"><AudioLockBanner t={t} visible /><h1 className="text-2xl font-extrabold">الطلبات الحية</h1></div>)
