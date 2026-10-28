import { useState, type FormEvent } from 'react'
import { GraduationCap } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { ErrorBox, Notice, btnPrimary } from '../components/ui'

type Mode = 'login' | 'register' | 'forgot'

const inputCls =
  'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400'

export function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null); setInfo(null)

    if (mode === 'register') {
      if (fullName.trim().length < 2) return setError('Please enter your full name.')
      if (password.length < 8) return setError('Password must be at least 8 characters.')
    }
    setBusy(true)
    try {
      if (mode === 'login') await signIn(email.trim(), password)
      else if (mode === 'register') {
        const { needsConfirmation } = await signUp(email.trim(), password, fullName.trim())
        if (needsConfirmation) setInfo('Account created. Check your email to confirm your address, then log in.')
      } else {
        await resetPassword(email.trim())
        setInfo('If an account exists for that address, a reset link is on its way.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'login' ? 'Log in' : mode === 'register' ? 'Create your account' : 'Reset your password'

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex items-center gap-3">
          <GraduationCap className="h-9 w-9 text-indigo-600" aria-hidden />
          <div>
            <div className="text-lg font-bold text-slate-900">COA Interactive Learning Lab</div>
            <div className="text-sm text-slate-500">Computer Organization and Architecture</div>
          </div>
        </div>
        <h1 className="mb-4 text-xl font-semibold text-slate-900">{title}</h1>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {mode === 'register' && (
            <label className="block text-sm font-medium text-slate-700">
              Full name
              <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
            </label>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          {mode !== 'forgot' && (
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required
              />
            </label>
          )}
          {error && <ErrorBox message={error} />}
          {info && <Notice>{info}</Notice>}
          <button type="submit" className={`${btnPrimary} w-full`} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : mode === 'register' ? 'Create account' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap justify-between gap-2 text-sm">
          {mode !== 'login' && <button className="text-indigo-700 hover:underline" onClick={() => { setMode('login'); setError(null); setInfo(null) }}>Back to log in</button>}
          {mode === 'login' && <button className="text-indigo-700 hover:underline" onClick={() => { setMode('register'); setError(null); setInfo(null) }}>Create an account</button>}
          {mode === 'login' && <button className="text-indigo-700 hover:underline" onClick={() => { setMode('forgot'); setError(null); setInfo(null) }}>Forgot password?</button>}
        </div>
      </div>
    </div>
  )
}

export function ResetPasswordPage() {
  const { session } = useAuth()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) setError(err.message)
    else setDone(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">Choose a new password</h1>
        {!session ? (
          <ErrorBox message="This reset link is invalid or has expired. Request a new one from the log-in page." />
        ) : done ? (
          <Notice>Password updated. <a className="font-semibold underline" href="/">Continue to the app</a>.</Notice>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              New password
              <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
            </label>
            {error && <ErrorBox message={error} />}
            <button className={`${btnPrimary} w-full`} disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
