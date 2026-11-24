import type { Api } from '../api'
import type { Lang, T } from '../i18n'
import { PageHeading } from '../components/PageHeading'

export type OrdersPageProps = {
  t: T
  lang: Lang
  api: Api
  onToast: (message: string) => void
}

export default function OrdersPage({ t }: OrdersPageProps) {
  return <PageHeading title={t.liveOrders.title} subtitle={t.liveOrders.subtitle} />
}
