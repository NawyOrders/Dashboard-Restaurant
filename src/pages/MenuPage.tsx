import type { Api } from '../api'
import type { Lang, T } from '../i18n'
import { PageHeading } from '../components/PageHeading'

export type MenuPageProps = {
  t: T
  lang: Lang
  api: Api
  onToast: (message: string) => void
}

export default function MenuPage({ t }: MenuPageProps) {
  return <PageHeading title={t.menuPage.title} subtitle={t.menuPage.subtitle} />
}
