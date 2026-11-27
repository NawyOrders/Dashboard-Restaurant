import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AuthError, API_BASE_URL, login } from '../auth'
import type { AuthErrorCode, Session } from '../auth'
import { isMockRequested } from '../api'
import type { MockRole } from '../mockAuth'
import type { T } from '../i18n'
import { EyeIcon, SpinnerIcon, UtensilsIcon } from '../icons'

const DEMO_ROLES: MockRole[] = ['Owner', 'Manager', 'Staff']

type Props = {
  t: T
  langToggle: string
  onToggleLang: () => void
  onSuccess: (session: Session) => void
  initialNotice?: string
}

type FieldErrors = {
  email?: 'emailRequired' | 'emailInvalid'
  password?: 'passwordRequired'
}

export function Login({ t, langToggle, onToggleLang, onSuccess, initialNotice }: Props) {
  const env = import.meta.env
  const defaultEmail = env.DEV
    ? env.VITE_LOGIN_OWNER_EMAIL ?? env.VITE_DEV_LOGIN_OWNER_EMAIL ?? ''
    : ''
  const defaultPassword = env.DEV
    ? env.VITE_LOGIN_PASSWORD ?? env.VITE_DEV_LOGIN_PASSWORD ?? ''
    : ''
  const [email, setEmail] = useState(initialNotice ? '' : defaultEmail)
  const [password, setPassword] = useState(initialNotice || !defaultEmail ? '' : defaultPassword)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null)
  const [pending, setPending] = useState(false)
  const [demoPending, setDemoPending] = useState<MockRole | null>(null)
  const demoAvailable =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    isMockRequested(window.location.search)
  const demoLabels: Record<MockRole, string> = {
    Owner: t.auth.demoOwner,
    Manager: t.auth.demoManager,
    Staff: t.auth.demoStaff,
  }
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const submittingRef = useRef(false)
  const focusFieldRef = useRef<'email' | 'password' | null>(null)

  useEffect(() => () => {
    requestRef.current?.abort()
    requestRef.current = null
  }, [])

  useEffect(() => {
    if (errorCode) errorRef.current?.focus()
  }, [errorCode])

  useEffect(() => {
    if (focusFieldRef.current === 'email') emailRef.current?.focus()
    if (focusFieldRef.current === 'password') passwordRef.current?.focus()
    focusFieldRef.current = null
  }, [fieldErrors])

  const errorMessages: Record<AuthErrorCode, string> = {
    invalidCredentials: t.auth.error,
    forbidden: t.auth.forbidden,
    rateLimited: t.auth.rateLimited,
    network: t.auth.network,
    timeout: t.auth.timeout,
    service: t.auth.service,
    invalidResponse: t.auth.invalidResponse,
    configuration: t.auth.configuration,
  }

  // Without a tenant origin the form must not send credentials anywhere.
  const configurationError = !API_BASE_URL

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (configurationError) {
      setErrorCode('configuration')
      return
    }
    // A ref closes the gap before React renders the disabled controls.
    if (submittingRef.current) return
    setErrorCode(null)

    const normalizedEmail = email.trim()
    const errors: FieldErrors = {}
    if (!normalizedEmail) errors.email = 'emailRequired'
    else if (emailRef.current?.validity.typeMismatch) errors.email = 'emailInvalid'
    if (!password) errors.password = 'passwordRequired'

    focusFieldRef.current = errors.email ? 'email' : errors.password ? 'password' : null
    setFieldErrors(errors)
    if (errors.email || errors.password) return

    submittingRef.current = true
    const controller = new AbortController()
    requestRef.current = controller
    setPending(true)

    try {
      const session = await login(normalizedEmail, password, controller.signal)
      if (controller.signal.aborted) return
      setPassword('')
      setShowPassword(false)
      onSuccess(session)
    } catch (cause) {
      if (!controller.signal.aborted) {
        // Never render server messages or disclose which credential failed.
        setErrorCode(cause instanceof AuthError ? cause.code : 'service')
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        submittingRef.current = false
        if (!controller.signal.aborted) setPending(false)
      }
    }
  }

  const handleDemoSignIn = async (role: MockRole) => {
    if (!import.meta.env.DEV || demoPending) return
    setErrorCode(null)
    setDemoPending(role)
    try {
      const { createMockSession } = await import('../mockAuth')
      onSuccess(createMockSession(role))
    } catch {
      setDemoPending(null)
      setErrorCode('service')
    }
  }

  const inputClass =
    'block min-h-14 w-full min-w-0 rounded-xl border border-line-strong bg-white px-4 py-3 text-left text-base text-ink-900 outline-none motion-safe:transition-colors hover:border-ink-500/60 focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-600/25 disabled:cursor-wait disabled:bg-cream-100 disabled:text-ink-500 aria-[invalid=true]:border-brand-600'
  const focusClass =
    'outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50'

  return (
    <main
      dir={t.dir}
      lang={t.dir === 'rtl' ? 'ar' : 'en'}
      className="login-page flex min-h-screen min-h-[100svh] flex-col bg-cream-50 text-ink-900 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
      aria-labelledby="login-heading"
    >
      <aside className="relative hidden min-w-0 flex-col items-center justify-center overflow-hidden bg-brand-600 px-12 py-24 text-center text-cream-50 lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-7 rounded-b-2xl rounded-t-[12rem] border border-gold-400/60"
        />
        <div className="relative w-full max-w-xs">
          <span aria-hidden="true" className="mb-8 inline-flex text-gold-400">
            <UtensilsIcon className="h-9 w-9" />
          </span>
          <h2 className="text-4xl font-extrabold leading-relaxed xl:text-5xl">
            <bdi>{t.auth.brandTitle}</bdi>
          </h2>
          <div aria-hidden="true" className="mx-auto my-7 h-px w-12 bg-gold-400" />
          <p className="text-lg leading-relaxed">{t.auth.brandSubtitle}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col px-5 sm:px-10 lg:px-12 xl:px-20">
        <header className="flex min-w-0 items-center justify-between gap-3 py-4 lg:justify-end lg:py-7">
          <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
            <span aria-hidden="true" className="shrink-0 text-brand-600">
              <UtensilsIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="login-brand-name text-base font-extrabold leading-snug text-brand-600">
                <bdi>{t.auth.brandTitle}</bdi>
              </p>
              <p className="mt-1 text-xs leading-snug text-ink-500">{t.auth.brandSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleLang}
            lang={t.dir === 'rtl' ? 'en' : 'ar'}
            dir="auto"
            className={`min-h-11 shrink-0 rounded-lg border border-line-strong px-3 text-sm font-bold motion-safe:transition-colors hover:border-brand-600 hover:text-brand-600 ${focusClass}`}
          >
            {langToggle}
          </button>
        </header>

        <div className="flex flex-1 items-center justify-center py-7 sm:py-10 lg:pb-20">
          <div className="w-full min-w-0 max-w-[26rem]">
            <p className="mb-5 border-s-2 border-gold-400 ps-3 text-sm font-medium leading-relaxed text-ink-500">
              {t.auth.staffOnly}
            </p>
            <h1 id="login-heading" className="text-3xl font-extrabold leading-relaxed sm:text-4xl">
              {t.auth.welcome}
            </h1>
            <p className="mb-7 mt-2 text-base leading-relaxed text-ink-500">{t.auth.subtitle}</p>

            {initialNotice && (
              <p role="status" className="mb-5 rounded-xl border border-line-strong bg-white/60 px-4 py-3 text-sm leading-relaxed">
                {initialNotice}
              </p>
            )}

            {configurationError && (
              <p role="alert" className="mb-5 rounded-xl border border-brand-600/30 bg-brand-600/5 px-4 py-3 text-sm font-medium leading-relaxed text-brand-600">
                {t.auth.configuration}
              </p>
            )}

            <form
              onSubmit={handleSubmit}
              noValidate
              aria-labelledby="login-heading"
              aria-describedby="login-help login-secure-hint"
              aria-busy={pending}
              className="flex flex-col gap-5"
            >
              {errorCode && (
                <p
                  ref={errorRef}
                  role="alert"
                  tabIndex={-1}
                  className="rounded-xl border border-brand-600/30 bg-brand-600/5 px-4 py-3 text-sm font-medium leading-relaxed text-brand-600 outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 focus:ring-offset-cream-50"
                >
                  {errorMessages[errorCode]}
                </p>
              )}

              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-bold">
                  {t.auth.email}
                </label>
                <input
                  ref={emailRef}
                  id="login-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  dir="ltr"
                  required
                  disabled={pending}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    setFieldErrors((current) => ({ ...current, email: undefined }))
                    setErrorCode(null)
                  }}
                  className={inputClass}
                />
                {fieldErrors.email && (
                  <p id="login-email-error" role="alert" className="mt-2 text-sm leading-relaxed text-brand-600">
                    {t.auth[fieldErrors.email]}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-bold">
                  {t.auth.password}
                </label>
                <div className="relative">
                  <input
                    ref={passwordRef}
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    dir="ltr"
                    required
                    disabled={pending}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setFieldErrors((current) => ({ ...current, password: undefined }))
                      setErrorCode(null)
                    }}
                    // The input stays LTR while the control follows the page direction.
                    className={`${inputClass} ${t.dir === 'rtl' ? 'pl-14 pr-4' : 'pl-4 pr-14'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    disabled={pending}
                    aria-label={showPassword ? t.auth.hide : t.auth.show}
                    title={showPassword ? t.auth.hide : t.auth.show}
                    aria-controls="login-password"
                    aria-pressed={showPassword}
                    className={`absolute end-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-ink-500 motion-safe:transition-colors hover:bg-cream-50 hover:text-brand-600 aria-pressed:bg-cream-50 aria-pressed:text-brand-600 disabled:cursor-wait disabled:opacity-50 ${focusClass}`}
                  >
                    <span aria-hidden="true"><EyeIcon className="h-5 w-5" /></span>
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="login-password-error" role="alert" className="mt-2 text-sm leading-relaxed text-brand-600">
                    {t.auth[fieldErrors.password]}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={pending || configurationError}
                className={`mt-1 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-base font-bold text-white motion-safe:transition-colors hover:bg-brand-500 disabled:cursor-wait disabled:opacity-75 ${focusClass}`}
              >
                {pending && <span aria-hidden="true"><SpinnerIcon className="h-5 w-5 motion-reduce:animate-none" /></span>}
                {pending ? t.auth.submitting : t.auth.submit}
              </button>
            </form>
            <p role="status" className="sr-only">{pending ? t.auth.submitting : ''}</p>

            {demoAvailable && (
              <section
                aria-labelledby="login-demo-heading"
                className="mt-6 rounded-xl border border-dashed border-line-strong bg-white/70 p-4"
              >
                <h2 id="login-demo-heading" className="text-sm font-bold text-gold-800">{t.auth.demoTitle}</h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{t.auth.demoHint}</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {DEMO_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => void handleDemoSignIn(role)}
                      disabled={demoPending !== null}
                      className="min-h-11 rounded-lg border border-line-strong bg-white px-3 py-2 text-sm font-bold text-ink-900 motion-safe:transition-colors hover:border-brand-600 hover:text-brand-600 disabled:cursor-wait disabled:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
                    >
                      {demoPending === role ? t.auth.submitting : demoLabels[role]}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="mt-6 border-t border-line-strong pt-5 text-ink-500">
              <p id="login-help" className="text-sm leading-relaxed">{t.auth.help}</p>
              <p id="login-secure-hint" className="mt-3 text-xs leading-relaxed">{t.auth.secureHint}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
