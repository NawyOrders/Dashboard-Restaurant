import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SetPassword } from './SetPassword'

vi.mock('../setPassword', async (original) => {
  const real = await original<typeof import('../setPassword')>()
  return { ...real, setInitialPassword: vi.fn() }
})
import { setInitialPassword, SetPasswordError } from '../setPassword'

afterEach(() => {
  vi.mocked(setInitialPassword).mockReset()
  window.history.replaceState(null, '', '/')
})

describe('set password page', () => {
  it('prefills email and token from the link and activates the account', async () => {
    window.history.replaceState(null, '', '/set-password?email=sara%40example.com&token=tok123')
    vi.mocked(setInitialPassword).mockResolvedValue(undefined)
    const onDone = vi.fn()
    render(<SetPassword lang="en" onToggleLang={() => {}} onDone={onDone} />)
    expect(screen.getByLabelText('Email')).toHaveValue('sara@example.com')
    expect(screen.getByLabelText('Activation token')).toHaveValue('tok123')
    await userEvent.type(screen.getByLabelText('New password'), 'NewPassword@2026')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'NewPassword@2026')
    await userEvent.click(screen.getByRole('button', { name: 'Activate account' }))
    expect(setInitialPassword).toHaveBeenCalledWith({ email: 'sara@example.com', token: 'tok123', newPassword: 'NewPassword@2026', confirmPassword: 'NewPassword@2026' })
    await userEvent.click(await screen.findByRole('button', { name: 'Go to sign in' }))
    expect(onDone).toHaveBeenCalled()
  })

  it('shows a clear message when the token is rejected', async () => {
    vi.mocked(setInitialPassword).mockRejectedValue(new SetPasswordError('forbidden'))
    render(<SetPassword lang="en" onToggleLang={() => {}} onDone={() => {}} />)
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co')
    await userEvent.type(screen.getByLabelText('Activation token'), 'x')
    await userEvent.type(screen.getByLabelText('New password'), 'NewPassword@2026')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'NewPassword@2026')
    await userEvent.click(screen.getByRole('button', { name: 'Activate account' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or has expired')
  })

  it('flags a weak password and renders in Arabic', async () => {
    render(<SetPassword lang="ar" onToggleLang={() => {}} onDone={() => {}} />)
    expect(screen.getByRole('heading', { name: 'فعّل حسابك' })).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('كلمة المرور الجديدة'), 'abc')
    expect(screen.getByLabelText('كلمة المرور الجديدة')).toHaveAttribute('aria-invalid', 'true')
  })
})
