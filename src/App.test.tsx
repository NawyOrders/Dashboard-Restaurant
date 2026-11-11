import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { translations } from './i18n'
import { staffLoginResponse } from './test/fixtures'

const fetchMock = vi.fn<typeof fetch>()
const ar = translations.ar
const en = translations.en

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubEnv('VITE_DEV_LOGIN_OWNER_EMAIL', '')
  vi.stubEnv('VITE_DEV_LOGIN_MANAGER_EMAIL', '')
  vi.stubEnv('VITE_DEV_LOGIN_STAFF_EMAIL', '')
  vi.stubEnv('VITE_DEV_LOGIN_PASSWORD', '')
  localStorage.clear()
})

function mount() {
  return render(<StrictMode><App /></StrictMode>)
}

async function signIn(role = 'Owner') {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(staffLoginResponse(role))))
  fireEvent.change(screen.getByLabelText(ar.auth.email), { target: { value: 'staff@example.test' } })
  fireEvent.change(screen.getByLabelText(ar.auth.password), { target: { value: 'test-only' } })
  fireEvent.click(screen.getByRole('button', { name: ar.auth.submit }))
  await screen.findByText(ar.auth.previewTitle)
}

describe('authentication lifecycle', () => {
  it('switches direction and language on the login screen', async () => {
    mount()
    expect(document.documentElement).toHaveAttribute('dir', 'rtl')
    await userEvent.click(screen.getByRole('button', { name: 'English' }))
    expect(document.documentElement).toHaveAttribute('dir', 'ltr')
    expect(document.documentElement).toHaveAttribute('lang', 'en')
    expect(screen.getByRole('heading', { name: en.auth.welcome })).toBeVisible()
    expect(document.title).toContain('Nawy Orders')
  })

  it('does not accept forged old localStorage sessions', () => {
    localStorage.setItem('nawy_session', JSON.stringify({ user: { email: 'manager@gmail.com', role: 'owner' }, token: 'fake' }))
    mount()
    expect(screen.getByLabelText(ar.auth.password)).toBeVisible()
    expect(localStorage.getItem('nawy_session')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['Owner', 'BranchManager', 'Staff'])('signs in as %s then out without conditional-hook errors', async (role) => {
    const consoleError = vi.spyOn(console, 'error')
    mount()
    await signIn(role)
    expect(screen.getByText('Test operator')).toBeInTheDocument()
    expect(screen.queryByLabelText(ar.auth.password)).not.toBeInTheDocument()
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ isSuccess: true })))
    fireEvent.click(screen.getByRole('button', { name: ar.logout }))
    expect(await screen.findByLabelText(ar.auth.password)).toHaveValue('')
    expect(screen.queryByText(ar.auth.previewTitle)).not.toBeInTheDocument()
    expect(consoleError).not.toHaveBeenCalled()
  })

  it('reload/remount cannot restore a token from browser storage', async () => {
    const view = mount()
    await signIn()
    view.unmount()
    mount()
    expect(screen.getByLabelText(ar.auth.password)).toBeVisible()
  })

  it('signs out when expiry is checked on tab focus', async () => {
    mount()
    await signIn()
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ isSuccess: true })))
    const future = Date.now() + 4_000_000
    vi.spyOn(Date, 'now').mockReturnValue(future)
    act(() => { window.dispatchEvent(new Event('focus')) })
    expect(await screen.findByText(ar.auth.sessionExpired)).toBeInTheDocument()
    expect(screen.getByLabelText(ar.auth.password)).toBeVisible()
  })

  it('clears local UI even when server revocation fails', async () => {
    mount()
    await signIn()
    fetchMock.mockRejectedValueOnce(new TypeError('offline'))
    fireEvent.click(screen.getByRole('button', { name: ar.logout }))
    expect(await screen.findByText(ar.auth.revokeFailed)).toBeInTheDocument()
    expect(screen.getByLabelText(ar.auth.password)).toBeVisible()
  })

  it('keeps late revocation warnings visible after a validation attempt', async () => {
    mount()
    await signIn()
    let rejectRevoke!: (reason: Error) => void
    fetchMock.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRevoke = reject }))
    fireEvent.click(screen.getByRole('button', { name: ar.logout }))
    fireEvent.click(screen.getByRole('button', { name: ar.auth.submit }))
    expect(screen.getByText(ar.auth.emailRequired)).toBeVisible()
    await act(async () => { rejectRevoke(new TypeError('offline')) })
    expect(await screen.findByText(ar.auth.revokeFailed)).toBeVisible()
  })

  it('ignores stale revocation failures after a new successful login', async () => {
    mount()
    await signIn()
    let rejectRevoke!: (reason: Error) => void
    fetchMock.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectRevoke = reject }))
    fireEvent.click(screen.getByRole('button', { name: ar.logout }))
    await signIn('Staff')
    await act(async () => { rejectRevoke(new TypeError('offline')) })
    expect(screen.getByText(ar.auth.previewTitle)).toBeVisible()
    expect(screen.queryByText(ar.auth.revokeFailed)).not.toBeInTheDocument()
  })

  it('works when persistent storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked') })
    mount()
    await signIn()
    expect(screen.getByText(ar.auth.previewTitle)).toBeVisible()
  })

  it('resetting authentication clears dashboard search state', async () => {
    mount()
    await signIn()
    fireEvent.change(screen.getAllByRole('searchbox')[0], { target: { value: 'previous-user-search' } })
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ isSuccess: true })))
    fireEvent.click(screen.getByRole('button', { name: ar.logout }))
    await signIn('Staff')
    expect(screen.getAllByRole('searchbox')[0]).toHaveValue('')
  })
})

describe('login form validation and feedback', () => {
  it('focuses invalid fields and makes no empty request', async () => {
    mount()
    await userEvent.click(screen.getByRole('button', { name: ar.auth.submit }))
    expect(screen.getByText(ar.auth.emailRequired)).toBeVisible()
    expect(screen.getByText(ar.auth.passwordRequired)).toBeVisible()
    expect(screen.getByLabelText(ar.auth.email)).toHaveFocus()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects malformed email before networking', async () => {
    mount()
    fireEvent.change(screen.getByLabelText(ar.auth.email), { target: { value: 'not-an-email' } })
    fireEvent.change(screen.getByLabelText(ar.auth.password), { target: { value: 'test' } })
    fireEvent.click(screen.getByRole('button', { name: ar.auth.submit }))
    expect(await screen.findByText(ar.auth.emailInvalid)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('toggles password visibility with an accessible pressed state', async () => {
    mount()
    await userEvent.click(screen.getByRole('button', { name: ar.auth.show }))
    expect(screen.getByLabelText(ar.auth.password)).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: ar.auth.hide })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: ar.auth.hide }))
    expect(screen.getByLabelText(ar.auth.password)).toHaveAttribute('type', 'password')
  })

  it('shows generic credential failures and focuses the alert', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ errors: { email: 'User does not exist' } }), { status: 401 }))
    mount()
    fireEvent.change(screen.getByLabelText(ar.auth.email), { target: { value: 'staff@example.test' } })
    fireEvent.change(screen.getByLabelText(ar.auth.password), { target: { value: 'bad-password' } })
    fireEvent.click(screen.getByRole('button', { name: ar.auth.submit }))
    expect(await screen.findByRole('alert')).toHaveTextContent(ar.auth.error)
    expect(screen.getByRole('alert')).toHaveFocus()
    expect(screen.queryByText('User does not exist')).not.toBeInTheDocument()
  })

  it('disables pending controls and prevents duplicate requests', async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    mount()
    fireEvent.change(screen.getByLabelText(ar.auth.email), { target: { value: 'staff@example.test' } })
    fireEvent.change(screen.getByLabelText(ar.auth.password), { target: { value: 'test' } })
    const form = screen.getByRole('form')
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(screen.getByLabelText(ar.auth.email)).toBeDisabled()
    expect(screen.getByLabelText(ar.auth.password)).toBeDisabled()
    expect(screen.getByRole('button', { name: ar.auth.submitting })).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await act(async () => { resolve(new Response('{}', { status: 401 })) })
    await waitFor(() => expect(screen.getByLabelText(ar.auth.email)).not.toBeDisabled())
  })

  it('aborts the pending request when login unmounts', async () => {
    let signal: AbortSignal | null | undefined
    fetchMock.mockImplementationOnce((_url, init) => {
      signal = init?.signal
      return new Promise((_resolve, reject) => signal?.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError'))))
    })
    const view = mount()
    fireEvent.change(screen.getByLabelText(ar.auth.email), { target: { value: 'staff@example.test' } })
    fireEvent.change(screen.getByLabelText(ar.auth.password), { target: { value: 'test' } })
    fireEvent.submit(screen.getByRole('form'))
    view.unmount()
    expect(signal?.aborted).toBe(true)
  })
})

describe('development account defaults', () => {
  beforeEach(() => {
    vi.stubEnv('DEV', true)
    vi.stubEnv('VITE_DEV_LOGIN_OWNER_EMAIL', 'owner@example.test')
    vi.stubEnv('VITE_DEV_LOGIN_MANAGER_EMAIL', 'manager@example.test')
    vi.stubEnv('VITE_DEV_LOGIN_STAFF_EMAIL', 'staff@example.test')
    vi.stubEnv('VITE_DEV_LOGIN_PASSWORD', 'fixture-only')
  })

  it('prefills Owner without signing in or writing credentials to storage', () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem')
    mount()
    expect(screen.getByLabelText(ar.auth.email)).toHaveValue('owner@example.test')
    expect(screen.getByLabelText(ar.auth.password)).toHaveValue('fixture-only')
    expect(screen.getByLabelText(ar.auth.password)).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: ar.roles.owner })).toHaveAttribute('aria-pressed', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(storageWrite).not.toHaveBeenCalled()
  })

  it.each(['owner', 'manager', 'staff'] as const)('submits the %s preset but trusts only server roles', async (role) => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(staffLoginResponse('Staff'))))
    mount()
    await userEvent.click(screen.getByRole('button', { name: ar.roles[role] }))
    expect(screen.getByLabelText(ar.auth.email)).toHaveValue(`${role}@example.test`)
    expect(screen.getByLabelText(ar.auth.password)).toHaveValue('fixture-only')
    expect(fetchMock).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: ar.auth.submit }))
    await screen.findByText(ar.auth.previewTitle)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ email: `${role}@example.test`, password: 'fixture-only' })
    expect(screen.getByText(ar.roles.staff)).toBeVisible()
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ isSuccess: true })))
    await userEvent.click(screen.getByRole('button', { name: ar.logout }))
    expect(await screen.findByLabelText(ar.auth.password)).toHaveValue('')
    expect(screen.getByLabelText(ar.auth.email)).toHaveValue('')
    await userEvent.click(screen.getByRole('button', { name: ar.roles[role] }))
    expect(screen.getByLabelText(ar.auth.password)).toHaveValue('fixture-only')
  })

  it('clears errors and masks the password when switching accounts after failure', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }))
    mount()
    await userEvent.click(screen.getByRole('button', { name: ar.auth.show }))
    await userEvent.click(screen.getByRole('button', { name: ar.auth.submit }))
    expect(await screen.findByRole('alert')).toHaveTextContent(ar.auth.error)
    expect(screen.queryByText(ar.auth.previewTitle)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: ar.roles.manager }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText(ar.auth.password)).toHaveAttribute('type', 'password')
    fireEvent.change(screen.getByLabelText(ar.auth.email), { target: { value: 'custom@example.test' } })
    expect(screen.getByRole('button', { name: ar.roles.manager })).toHaveAttribute('aria-pressed', 'false')
  })

  it('disables account switching during authentication', async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise((done) => { resolve = done }))
    mount()
    fireEvent.submit(screen.getByRole('form'))
    for (const role of ['owner', 'manager', 'staff'] as const) {
      expect(screen.getByRole('button', { name: ar.roles[role] })).toBeDisabled()
    }
    await userEvent.click(screen.getByRole('button', { name: ar.roles.manager }))
    expect(screen.getByLabelText(ar.auth.email)).toHaveValue('owner@example.test')
    await act(async () => { resolve(new Response('{}', { status: 401 })) })
    expect(screen.getByRole('button', { name: ar.roles.manager })).toBeEnabled()
  })

  it('ignores configured credentials outside development', () => {
    vi.stubEnv('DEV', false)
    mount()
    expect(screen.queryByRole('group', { name: ar.auth.defaultAccounts })).not.toBeInTheDocument()
    expect(screen.getByLabelText(ar.auth.email)).toHaveValue('')
    expect(screen.getByLabelText(ar.auth.password)).toHaveValue('')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the form empty when no default accounts are configured', () => {
    vi.stubEnv('VITE_DEV_LOGIN_OWNER_EMAIL', '')
    vi.stubEnv('VITE_DEV_LOGIN_MANAGER_EMAIL', '')
    vi.stubEnv('VITE_DEV_LOGIN_STAFF_EMAIL', '')
    mount()
    expect(screen.queryByRole('group', { name: ar.auth.defaultAccounts })).not.toBeInTheDocument()
    expect(screen.getByLabelText(ar.auth.password)).toHaveValue('')
  })
})
