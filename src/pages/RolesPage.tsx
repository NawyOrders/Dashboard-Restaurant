import { useCallback, useEffect, useState } from 'react'
import type { Api } from '../api'
import type { PermissionInfo, RoleSummary } from '../api/roles'
import { can, PERMISSIONS } from '../authz'
import type { Lang, T } from '../i18n'
import { Modal } from '../components/Modal'
import { PageHeading } from '../components/PageHeading'
import { EditIcon, PlusIcon, SpinnerIcon } from '../icons'
import { BTN_GHOST, BTN_PRIMARY, EmptyPanel, ErrorPanel, Field, INPUT, LoadingPanel, Pill } from '../manage/kit'
import { manageCopy } from '../manage/text'

export type RolesPageProps = {
  t: T
  lang: Lang
  api: Api
  permissions: readonly string[]
  onToast: (message: string) => void
}

// The reference limits these endpoints to the Owner. The UI offers them to
// whoever holds staff.manage and the server still answers 403 for anyone else.
export default function RolesPage({ t, lang, api, permissions, onToast }: RolesPageProps) {
  const c = manageCopy[lang]
  const r = c.roles
  const allowed = can(permissions, PERMISSIONS.staffManage)
  const [roles, setRoles] = useState<RoleSummary[]>([])
  const [catalog, setCatalog] = useState<PermissionInfo[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<{ role: RoleSummary | null } | null>(null)

  useEffect(() => {
    if (!allowed) return
    let cancelled = false
    setState('loading')
    Promise.all([api.listRoles(), api.listPermissions()])
      .then(([list, permissionList]) => {
        if (cancelled) return
        setRoles(list)
        setCatalog(permissionList)
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [api, allowed, reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])
  if (!allowed) return <EmptyPanel text={c.noAccess} />

  return (
    <div>
      <PageHeading
        title={r.title}
        subtitle={r.subtitle}
        action={
          <button type="button" onClick={() => setEditing({ role: null })} className={BTN_PRIMARY}>
            <PlusIcon className="h-4 w-4" />
            {r.add}
          </button>
        }
      />
      {state === 'loading' && <LoadingPanel text={c.loading} />}
      {state === 'error' && <ErrorPanel text={c.loadError} retry={c.retry} onRetry={reload} />}
      {state === 'ready' && (
        <section>
          {roles.length === 0 && <EmptyPanel text={r.empty} />}
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => (
              <li key={role.id} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-line bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words text-sm font-extrabold text-stone-800">{role.name}</h3>
                  <Pill tone={role.kind === 'Custom' ? 'good' : 'gold'}>{r.kinds[role.kind]}</Pill>
                </div>
                {role.description && <p className="text-xs text-stone-500">{role.description}</p>}
                <p className="text-xs text-stone-500">
                  {role.staffCount} {r.staffCount} · {role.permissionKeys.length} {r.permissionsCount}
                </p>
                {!role.isProtected && (
                  <div className="mt-1">
                    <button type="button" onClick={() => setEditing({ role })} className={`${BTN_GHOST} min-h-10 px-3 text-xs`}>
                      <EditIcon className="h-4 w-4" />
                      {c.edit}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {editing && (
        <RoleForm
          t={t}
          lang={lang}
          api={api}
          role={editing.role}
          catalog={catalog}
          onClose={() => setEditing(null)}
          onDone={(message) => {
            setEditing(null)
            onToast(message)
            reload()
          }}
        />
      )}
    </div>
  )
}

function RoleForm({ t, lang, api, role, catalog, onClose, onDone }: {
  t: T
  lang: Lang
  api: Api
  role: RoleSummary | null
  catalog: PermissionInfo[]
  onClose: () => void
  onDone: (message: string) => void
}) {
  const c = manageCopy[lang]
  const r = c.roles
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [keys, setKeys] = useState<string[]>(role?.permissionKeys ?? [])
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toggle = (key: string) => setKeys((list) => (list.includes(key) ? list.filter((item) => item !== key) : [...list, key]))
  const modules = Array.from(new Set(catalog.map((item) => item.module)))

  const submit = async () => {
    if (!name.trim() || name.length > 100 || description.length > 500) {
      setError(r.invalid)
      return
    }
    setSaving(true)
    try {
      const text = description.trim() || null
      if (role) {
        await api.updateRole(role.id, { name: name.trim(), description: text })
        await api.replaceRolePermissions(role.id, keys)
      } else {
        await api.createRole({ name: name.trim(), description: text, permissionKeys: keys })
      }
      onDone(c.saved)
    } catch {
      setError(c.saveError)
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!role) return
    setSaving(true)
    try {
      await api.deleteRole(role.id)
      onDone(c.deleted)
    } catch {
      setError(c.saveError)
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={role ? r.edit : r.add}
      closeLabel={t.actions.close}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {role?.canBeDeleted && (
              <button type="button" disabled={saving} onClick={() => (confirming ? void remove() : setConfirming(true))} className={`${BTN_GHOST} text-brand-700`}>
                {confirming ? c.confirmDelete : c.delete}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={BTN_GHOST}>{c.cancel}</button>
            <button type="button" disabled={saving} onClick={() => void submit()} className={BTN_PRIMARY}>
              {saving && <SpinnerIcon className="h-4 w-4" />}
              {c.save}
            </button>
          </div>
        </div>
      }
    >
      <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        {error && <p role="alert" className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700">{error}</p>}
        <Field id="role-name" label={r.name}>
          <input id="role-name" type="text" maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={INPUT} />
        </Field>
        <Field id="role-description" label={r.description}>
          <textarea id="role-description" rows={2} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} className={INPUT} />
        </Field>
        <div>
          <p className="mb-2 text-xs font-bold text-stone-600">{r.permissions}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {modules.map((module) => (
              <fieldset key={module} className="rounded-xl border border-line p-3">
                <legend className="px-1 text-xs font-extrabold text-stone-700">{module}</legend>
                {catalog.filter((item) => item.module === module).map((item) => (
                  <label key={item.key} className="flex items-start gap-2 py-1 text-xs text-stone-700">
                    <input type="checkbox" className="mt-0.5" checked={keys.includes(item.key)} onChange={() => toggle(item.key)} />
                    <span>
                      <span dir="ltr" className="font-bold">{item.key}</span>
                      {item.description && <span className="block text-stone-500">{item.description}</span>}
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}
