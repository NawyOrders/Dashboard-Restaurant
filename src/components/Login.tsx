import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AuthError, login } from '../auth'
import type { AuthErrorCode, Session } from '../auth'
import type { T } from '../i18n'
import { EyeIcon, SpinnerIcon, UtensilsIcon } from '../icons'

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
  const defaultEmail = import.meta.env.DEV ? import.meta.env.VITE_DEV_LOGIN_OWNER_EMAIL ?? '' : ''
  const defaultPassword = import.meta.env.DEV ? import.meta.env.VITE_DEV_LOGIN_PASSWORD ?? '' : ''
  const [email, setEmail] = useState(initialNotice ? '' : defaultEmail)
  const [password, setPassword] = useState(initialNotice || !defaultEmail ? '' : defaultPassword)
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(null)
  const [pending, setPending] = useState(false)
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
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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

  const inputClass =
    'block min-h-14 w-full min-w-0 rounded-xl border border-[#D9C9B5] bg-white px-4 py-3 text-left text-base text-[#342B27] outline-none motion-safe:transition-colors hover:border-[#A48E77] focus-visible:border-[#C2281A] focus-visible:ring-2 focus-visible:ring-[#C2281A]/25 disabled:cursor-wait disabled:bg-[#F3ECE2] disabled:text-[#726255] aria-[invalid=true]:border-[#C2281A]'
  const focusClass =
    'outline-none focus-visible:ring-2 focus-visible:ring-[#C2281A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDF8F1]'

  return (
    <main
      dir={t.dir}
      lang={t.dir === 'rtl' ? 'ar' : 'en'}
      className="login-page flex min-h-screen min-h-[100svh] flex-col bg-[#FDF8F1] text-[#342B27] lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
      aria-labelledby="login-heading"
    >
      <aside className="relative hidden min-w-0 flex-col items-center justify-center overflow-hidden bg-[#C2281A] px-12 py-24 text-center text-[#FDF8F1] lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-7 rounded-b-2xl rounded-t-[12rem] border border-[#D9B45A]/60"
        />
        <div className="relative w-full max-w-xs">
          <span aria-hidden="true" className="mb-8 inline-flex text-[#D9B45A]">
            <UtensilsIcon className="h-9 w-9" />
          </span>
          <h2 className="text-4xl font-extrabold leading-relaxed xl:text-5xl">
            <bdi>{t.auth.brandTitle}</bdi>
          </h2>
          <div aria-hidden="true" className="mx-auto my-7 h-px w-12 bg-[#D9B45A]" />
          <p className="text-lg leading-relaxed">{t.auth.brandSubtitle}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col px-5 sm:px-10 lg:px-12 xl:px-20">
        <header className="flex min-w-0 items-center justify-between gap-3 py-4 lg:justify-end lg:py-7">
          <div className="flex min-w-0 items-center gap-2.5 lg:hidden">
            <span aria-hidden="true" className="shrink-0 text-[#C2281A]">
              <UtensilsIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="login-brand-name text-base font-extrabold leading-snug text-[#C2281A]">
                <bdi>{t.auth.brandTitle}</bdi>
              </p>
              <p className="mt-1 text-xs leading-snug text-[#726255]">{t.auth.brandSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleLang}
            lang={t.dir === 'rtl' ? 'en' : 'ar'}
            dir="auto"
            className={`min-h-11 shrink-0 rounded-lg border border-[#D9C9B5] px-3 text-sm font-bold motion-safe:transition-colors hover:border-[#C2281A] hover:text-[#C2281A] ${focusClass}`}
          >
            {langToggle}
          </button>
        </header>

        <div className="flex flex-1 items-center justify-center py-7 sm:py-10 lg:pb-20">
          <div className="w-full min-w-0 max-w-[26rem]">
            <p className="mb-5 border-s-2 border-[#D9B45A] ps-3 text-sm font-medium leading-relaxed text-[#726255]">
              {t.auth.staffOnly}
            </p>
            <h1 id="login-heading" className="text-3xl font-extrabold leading-relaxed sm:text-4xl">
              {t.auth.welcome}
            </h1>
            <p className="mb-7 mt-2 text-base leading-relaxed text-[#726255]">{t.auth.subtitle}</p>

            {initialNotice && (
              <p role="status" className="mb-5 rounded-xl border border-[#D9C9B5] bg-white/60 px-4 py-3 text-sm leading-relaxed">
                {initialNotice}
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
                  className="rounded-xl border border-[#C2281A]/30 bg-[#C2281A]/5 px-4 py-3 text-sm font-medium leading-relaxed text-[#C2281A] outline-none focus:ring-2 focus:ring-[#C2281A] focus:ring-offset-2 focus:ring-offset-[#FDF8F1]"
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
                  <p id="login-email-error" role="alert" className="mt-2 text-sm leading-relaxed text-[#C2281A]">
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
                    className={`absolute end-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-[#726255] motion-safe:transition-colors hover:bg-[#FDF8F1] hover:text-[#C2281A] aria-pressed:bg-[#FDF8F1] aria-pressed:text-[#C2281A] disabled:cursor-wait disabled:opacity-50 ${focusClass}`}
                  >
                    <span aria-hidden="true"><EyeIcon className="h-5 w-5" /></span>
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="login-password-error" role="alert" className="mt-2 text-sm leading-relaxed text-[#C2281A]">
                    {t.auth[fieldErrors.password]}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={pending}
                className={`mt-1 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#C2281A] px-4 py-3 text-base font-bold text-white motion-safe:transition-colors hover:bg-[#D93B2B] disabled:cursor-wait disabled:opacity-75 ${focusClass}`}
              >
                {pending && <span aria-hidden="true"><SpinnerIcon className="h-5 w-5 motion-reduce:animate-none" /></span>}
                {pending ? t.auth.submitting : t.auth.submit}
              </button>
            </form>
            <p role="status" className="sr-only">{pending ? t.auth.submitting : ''}</p>

            <div className="mt-6 border-t border-[#D9C9B5] pt-5 text-[#726255]">
              <p id="login-help" className="text-sm leading-relaxed">{t.auth.help}</p>
              <p id="login-secure-hint" className="mt-3 text-xs leading-relaxed">{t.auth.secureHint}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
