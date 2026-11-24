import type { Lang, T } from '../i18n'
import { PageHeading } from '../components/PageHeading'

export type SettingsPageProps = {
  t: T
  lang: Lang
  storageKey: string
  onToast: (message: string) => void
}

export default function SettingsPage({ t }: SettingsPageProps) {
  return <PageHeading title={t.settingsPage.title} subtitle={t.settingsPage.subtitle} />
}
