import { useState } from 'react'
import type { FormEvent } from 'react'
import { isStrongPassword, setInitialPassword, SetPasswordError } from '../setPassword'
import type { SetPasswordErrorCode } from '../setPassword'
import type { Lang } from '../i18n'
import { SpinnerIcon, UtensilsIcon } from '../icons'

// Public activation page for an invited staff member (reference section 8).
// The emailed link carries the address and the raw token as `email` and
// `token` query parameters; both stay editable in case a link is cut short.
const copy = {
  ar: {
    dir: 'rtl' as const,
    toggle: 'English',
    brand: 'نوي أوردرز',
    title: 'فعّل حسابك',
    subtitle: 'اختر كلمة مرور لتبدأ العمل مع فريق المطعم',
    email: 'البريد الإلكتروني',
    token: 'رمز التفعيل',
    password: 'كلمة المرور الجديدة',
    confirm: 'تأكيد كلمة المرور',
    rule: '٨ أحرف على الأقل، مع حرف كبير وحرف صغير ورقم ورمز خاص.',
    submit: 'تفعيل الحساب',
    submitting: 'جارٍ التفعيل…',
    doneTitle: 'تم تفعيل حسابك',
    doneText: 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.',
    login: 'الذهاب لتسجيل الدخول',
    errors: {
      validation: 'تأكد من البريد والرمز، وأن كلمة المرور قوية وأن التأكيد يطابقها.',
      conflict: 'هذا الحساب مفعّل بالفعل. سجّل الدخول مباشرة.',
      rateLimited: 'محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.',
      forbidden: 'رمز التفعيل غير صالح أو انتهت صلاحيته. اطلب من المالك إعادة إرسال الدعوة.',
      notFound: 'لم نجد دعوة بهذه البيانات. اطلب من المالك إعادة إرسال الدعوة.',
      network: 'تعذّر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.',
      timeout: 'انتهت مهلة الطلب. حاول مرة أخرى.',
      service: 'حدثت مشكلة في الخدمة. حاول مرة أخرى بعد قليل.',
      invalidResponse: 'ردّ غير متوقع من الخادم. حاول مرة أخرى.',
      configuration: 'هذه النسخة غير موصولة بخادم المطعم.',
    } satisfies Record<SetPasswordErrorCode, string>,
  },
  en: {
    dir: 'ltr' as const,
    toggle: 'العربية',
    brand: 'Nawy Orders',
    title: 'Activate your account',
    subtitle: 'Choose a password to start working with the restaurant team',
    email: 'Email',
    token: 'Activation token',
    password: 'New password',
    confirm: 'Confirm password',
    rule: 'At least 8 characters with an uppercase letter, a lowercase letter, a digit and a special character.',
    submit: 'Activate account',
    submitting: 'Activating…',
    doneTitle: 'Your account is active',
    doneText: 'You can now sign in with your new password.',
    login: 'Go to sign in',
    errors: {
      validation: 'Check the email and token, use a strong password, and make the confirmation match.',
      conflict: 'This account is already active. Sign in directly.',
      rateLimited: 'Too many attempts. Wait a moment and try again.',
      forbidden: 'The activation token is invalid or has expired. Ask the owner to resend the invitation.',
      notFound: 'No invitation matches these details. Ask the owner to resend the invitation.',
      network: 'Could not reach the server. Check your connection and try again.',
      timeout: 'The request timed out. Try again.',
      service: 'The service had a problem. Try again shortly.',
      invalidResponse: 'The server sent an unexpected reply. Try again.',
      configuration: 'This build is not connected to a restaurant server.',
    } satisfies Record<SetPasswordErrorCode, string>,
  },
}

export const SET_PASSWORD_PATH = '/set-password'

type Props = { lang: Lang; onToggleLang: () => void; onDone: () => void }

const INPUT =
  'block min-h-14 w-full min-w-0 rounded-xl border border-[#D9C9B5] bg-white px-4 py-3 text-left text-base text-[#342B27] outline-none hover:border-[#A48E77] focus-visible:border-[#C2281A] focus-visible:ring-2 focus-visible:ring-[#C2281A]/25 disabled:bg-[#F3ECE2] aria-[invalid=true]:border-[#C2281A]'

export function SetPassword({ lang, onToggleLang, onDone }: Props) {
  const t = copy[lang]
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search)
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [token, setToken] = useState(params.get('token') ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<SetPasswordErrorCode | null>(null)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const weak = password.length > 0 && !isStrongPassword(password)
  const mismatch = confirm.length > 0 && confirm !== password

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    setError(null)
    setPending(true)
    try {
      await setInitialPassword({ email, token, newPassword: password, confirmPassword: confirm })
      setDone(true)
    } catch (caught) {
      setError(caught instanceof SetPasswordError ? caught.code : 'service')
    } finally {
      setPending(false)
    }
  }

  return (
    <main dir={t.dir} lang={lang} className="flex min-h-screen min-h-[100svh] flex-col bg-[#FDF8F1] px-5 text-[#342B27] sm:px-10" aria-labelledby="setpw-heading">
      <header className="flex items-center justify-between gap-3 py-4">
        <div className="flex items-center gap-2.5 text-[#C2281A]">
          <UtensilsIcon className="h-6 w-6" />
          <p className="text-base font-extrabold"><bdi>{t.brand}</bdi></p>
        </div>
        <button type="button" onClick={onToggleLang} className="min-h-11 rounded-lg border border-[#D9C9B5] px-3 text-sm font-bold hover:border-[#C2281A] hover:text-[#C2281A]">
          {t.toggle}
        </button>
      </header>
      <div className="flex flex-1 items-center justify-center py-8">
        <div className="w-full max-w-[26rem]">
          {done ? (
            <div role="status" className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <h1 id="setpw-heading" className="text-2xl font-extrabold">{t.doneTitle}</h1>
              <p className="mb-6 mt-2 text-base text-[#726255]">{t.doneText}</p>
              <button type="button" onClick={onDone} className="min-h-12 w-full rounded-xl bg-[#C2281A] px-4 text-base font-bold text-white hover:bg-[#A82014]">
                {t.login}
              </button>
            </div>
          ) : (
            <>
              <h1 id="setpw-heading" className="text-3xl font-extrabold leading-relaxed">{t.title}</h1>
              <p className="mb-7 mt-2 text-base leading-relaxed text-[#726255]">{t.subtitle}</p>
              <form onSubmit={submit} noValidate aria-busy={pending} className="flex flex-col gap-5">
                {error && (
                  <p role="alert" className="rounded-xl border border-[#C2281A]/30 bg-[#C2281A]/5 px-4 py-3 text-sm font-medium leading-relaxed text-[#C2281A]">
                    {t.errors[error]}
                  </p>
                )}
                <div>
                  <label htmlFor="setpw-email" className="mb-2 block text-sm font-bold">{t.email}</label>
                  <input id="setpw-email" type="email" dir="ltr" autoComplete="username" disabled={pending} value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label htmlFor="setpw-token" className="mb-2 block text-sm font-bold">{t.token}</label>
                  <input id="setpw-token" type="text" dir="ltr" autoComplete="off" spellCheck={false} disabled={pending} value={token} onChange={(e) => setToken(e.target.value)} className={INPUT} />
                </div>
                <div>
                  <label htmlFor="setpw-password" className="mb-2 block text-sm font-bold">{t.password}</label>
                  <input id="setpw-password" type="password" dir="ltr" autoComplete="new-password" disabled={pending} aria-invalid={weak} aria-describedby="setpw-rule" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
                  <p id="setpw-rule" className={`mt-2 text-xs leading-relaxed ${weak ? 'text-[#C2281A]' : 'text-[#726255]'}`}>{t.rule}</p>
                </div>
                <div>
                  <label htmlFor="setpw-confirm" className="mb-2 block text-sm font-bold">{t.confirm}</label>
                  <input id="setpw-confirm" type="password" dir="ltr" autoComplete="new-password" disabled={pending} aria-invalid={mismatch} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={INPUT} />
                </div>
                <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#C2281A] px-4 text-base font-bold text-white hover:bg-[#A82014] disabled:opacity-70">
                  {pending && <SpinnerIcon className="h-4 w-4 animate-spin" />}
                  {pending ? t.submitting : t.submit}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
