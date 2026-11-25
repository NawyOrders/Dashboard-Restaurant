import { useCallback, useEffect, useState } from 'react'
import type { Api } from '../api'
import type { BranchDetails } from '../api/branches'
import type { RoleSummary } from '../api/roles'
import type { StaffUser } from '../api/staff'
import { can, PERMISSIONS } from '../authz'
import type { Lang, T } from '../i18n'
import { Modal } from '../components/Modal'
import { PageHeading } from '../components/PageHeading'
import { PlusIcon, SpinnerIcon } from '../icons'
import { BTN_GHOST, BTN_PRIMARY, EmptyPanel, ErrorPanel, Field, INPUT, LoadingPanel, Pill } from '../manage/kit'
import { manageCopy } from '../manage/text'

export type StaffPageProps = {
  t: T
  lang: Lang
  api: Api
  permissions: readonly string[]
  onToast: (message: string) => void
}

type Data = { staff: StaffUser[]; roles: RoleSummary[]; branches: BranchDetails[] }

export default function StaffPage({ t, lang, api, permissions, onToast }: StaffPageProps) {
  const c = manageCopy[lang]
  const s = c.staff
  const canManage = can(permissions, PERMISSIONS.staffManage)
  const canView = canManage || can(permissions, PERMISSIONS.staffView)
  const [data, setData] = useState<Data>({ staff: [], roles: [], branches: [] })
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [inviting, setInviting] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (!canView) return
    let cancelled = false
    setState('loading')
    Promise.all([api.listStaff({ pageSize: 100 }), api.listRoles(), api.listBranches({ pageSize: 100 })])
      .then(([staff, roles, branches]) => {
        if (cancelled) return
        setData({ staff: staff.items, roles, branches: branches.items })
        setState('ready')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [api, canView, reloadKey])

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])
  if (!canView) return <EmptyPanel text={c.noAccess} />

  const run = async (id: string, action: () => Promise<void>, message: string, refresh = true) => {
    setBusyId(id)
    try {
      await action()
      onToast(message)
      if (refresh) reload()
    } catch {
      onToast(c.saveError)
    } finally {
      setBusyId(null)
      setConfirmId(null)
    }
  }

  return (
    <div>
      <PageHeading
        title={s.title}
        subtitle={s.subtitle}
        action={
          canManage && (
            <button type="button" onClick={() => setInviting(true)} className={BTN_PRIMARY}>
              <PlusIcon className="h-4 w-4" />
              {s.invite}
            </button>
          )
        }
      />
      {state === 'loading' && <LoadingPanel text={c.loading} />}
      {state === 'error' && <ErrorPanel text={c.loadError} retry={c.retry} onRetry={reload} />}
      {state === 'ready' && (
        <section>
          {data.staff.length === 0 && <EmptyPanel text={s.empty} />}
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {data.staff.map((user) => {
              const isOwner = data.roles.find((role) => role.id === user.roleId)?.kind === 'Owner'
              return (
                <li key={user.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-extrabold text-stone-800">{user.fullName}</h3>
                      <p className="mt-0.5 break-all text-xs text-stone-500" dir="ltr">{user.email}</p>
                    </div>
                    {user.status && (
                      <Pill tone={user.status === 'Active' ? 'good' : user.status === 'Inactive' ? 'muted' : 'gold'}>{s.statuses[user.status]}</Pill>
                    )}
                  </div>
                  <Field id={`role-${user.id}`} label={s.role}>
                    <select
                      id={`role-${user.id}`}
                      value={user.roleId ?? ''}
                      disabled={!canManage || isOwner || busyId === user.id}
                      onChange={(event) => void run(user.id, () => api.changeStaffRole(user.id, event.target.value), c.saved)}
                      className={INPUT}
                    >
                      {user.roleId === null && <option value="">{user.role}</option>}
                      {data.roles.filter((role) => role.kind !== 'Owner' || role.id === user.roleId).map((role) => (
                        <option key={role.id} value={role.id}>{role.name}</option>
                      ))}
                    </select>
                  </Field>
                  {canManage && !isOwner && (
                    <div className="flex flex-wrap gap-2">
                      {user.status === 'PendingInvitation' && (
                        <button type="button" disabled={busyId === user.id} onClick={() => void run(user.id, () => api.resendStaffInvitation(user.id), s.resent, false)} className={`${BTN_GHOST} min-h-10 px-3 text-xs`}>
                          {s.resend}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={busyId === user.id}
                        onClick={() => (confirmId === user.id ? void run(user.id, () => api.deleteStaff(user.id), c.deleted) : setConfirmId(user.id))}
                        className={`${BTN_GHOST} min-h-10 px-3 text-xs text-brand-700`}
                      >
                        {confirmId === user.id ? c.confirmDelete : c.delete}
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {inviting && (
        <InviteForm
          t={t}
          lang={lang}
          api={api}
          roles={data.roles.filter((role) => role.kind !== 'Owner')}
          branches={data.branches}
          onClose={() => setInviting(false)}
          onDone={() => {
            setInviting(false)
            onToast(s.invited)
            reload()
          }}
        />
      )}
    </div>
  )
}

function InviteForm({ t, lang, api, roles, branches, onClose, onDone }: {
  t: T
  lang: Lang
  api: Api
  roles: RoleSummary[]
  branches: BranchDetails[]
  onClose: () => void
  onDone: () => void
}) {
  const c = manageCopy[lang]
  const s = c.staff
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '')
  const [branchIds, setBranchIds] = useState<string[]>(branches.filter((b) => b.isPrimary).map((b) => b.id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toggle = (id: string) => setBranchIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))

  const submit = async () => {
    if (fullName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email.trim()) || !roleId || branchIds.length === 0) {
      setError(s.invalid)
      return
    }
    setSaving(true)
    try {
      await api.inviteStaff({ fullName: fullName.trim(), email: email.trim(), phone: phone.trim() || null, roleId, branchIds })
      onDone()
    } catch {
      setError(c.saveError)
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={s.invite}
      closeLabel={t.actions.close}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={BTN_GHOST}>{c.cancel}</button>
          <button type="button" disabled={saving} onClick={() => void submit()} className={BTN_PRIMARY}>
            {saving && <SpinnerIcon className="h-4 w-4" />}
            {c.save}
          </button>
        </div>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void submit() }}>
        {error && <p role="alert" className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-700 sm:col-span-2">{error}</p>}
        <Field id="staff-name" label={s.fullName}>
          <input id="staff-name" type="text" maxLength={200} value={fullName} onChange={(event) => setFullName(event.target.value)} className={INPUT} />
        </Field>
        <Field id="staff-email" label={s.email}>
          <input id="staff-email" type="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} className={`${INPUT} text-start`} />
        </Field>
        <Field id="staff-phone" label={s.phone}>
          <input id="staff-phone" type="tel" dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} className={`${INPUT} text-start`} />
        </Field>
        <Field id="staff-role" label={s.role}>
          <select id="staff-role" value={roleId} onChange={(event) => setRoleId(event.target.value)} className={INPUT}>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-xs font-bold text-stone-600">{s.branches}</legend>
          <div className="flex flex-wrap gap-3">
            {branches.map((branch) => (
              <label key={branch.id} className="flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" checked={branchIds.includes(branch.id)} onChange={() => toggle(branch.id)} />
                {lang === 'ar' ? branch.nameAr || branch.nameEn : branch.nameEn || branch.nameAr}
              </label>
            ))}
          </div>
        </fieldset>
      </form>
    </Modal>
  )
                      }
