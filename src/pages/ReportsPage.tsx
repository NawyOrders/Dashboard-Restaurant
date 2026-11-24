import type { Api } from '../api'
import type { Lang, T } from '../i18n'
import { PageHeading } from '../components/PageHeading'

export type ReportsPageProps = {
  t: T
  lang: Lang
  api: Api
  onToast: (message: string) => void
}

export default function ReportsPage({ t }: ReportsPageProps) {
  return <PageHeading title={t.reports.title} subtitle={t.reports.subtitle} />
}
