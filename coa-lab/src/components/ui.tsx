import { useEffect, useRef, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-slate-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> <span>{label}</span>
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="flex-1 text-sm">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="rounded-md border border-red-300 px-3 py-1 text-sm font-medium hover:bg-red-100">
          Retry
        </button>
      )}
    </div>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> <div>{children}</div>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {children && <div className="mt-2 text-sm text-slate-500">{children}</div>}
    </div>
  )
}

export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const p = Math.max(0, Math.min(100, percent))
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
      role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p)} aria-label={label ?? 'Progress'}
    >
      <div className="h-full rounded-full bg-indigo-600 transition-[width]" style={{ width: `${p}%` }} />
    </div>
  )
}

type Tone = 'neutral' | 'success' | 'danger' | 'info' | 'warning'
const tones: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-indigo-100 text-indigo-800',
  warning: 'bg-amber-100 text-amber-800',
}
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50'
export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

export function ConfirmDialog(props: {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  busy?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { open, onCancel } = props

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLButtonElement>('button[data-confirm]')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!props.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="dlg-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="dlg-title" className="text-lg font-semibold text-slate-900">{props.title}</h2>
        <div className="mt-2 text-sm text-slate-600">{props.children}</div>
        <div className="mt-6 flex justify-end gap-3">
          <button className={btnSecondary} onClick={props.onCancel} disabled={props.busy}>Cancel</button>
          <button data-confirm className={btnPrimary} onClick={props.onConfirm} disabled={props.busy}>
            {props.busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
