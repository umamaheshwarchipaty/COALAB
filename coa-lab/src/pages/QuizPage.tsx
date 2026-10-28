import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, TrendingDown, TrendingUp, XCircle } from 'lucide-react'
import { startQuiz, submitQuiz } from '../lib/api'
import { useData } from '../lib/DataContext'
import type { StartQuizResponse, SubmitQuizResponse } from '../lib/types'
import {
  Badge, Card, ConfirmDialog, ErrorBox, PageHeader, Spinner, btnPrimary, btnSecondary,
} from '../components/ui'

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function QuizPage() {
  const { quizId } = useParams()
  const d = useData()
  const mod = d.modules.find((m) => m.quiz?.id === quizId)
  const quizMeta = mod?.quiz ?? null

  const [session, setSession] = useState<StartQuizResponse | null>(null)
  const [result, setResult] = useState<SubmitQuizResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [current, setCurrent] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const submittedRef = useRef(false)

  const begin = useCallback(async () => {
    if (!quizId) return
    setLoading(true); setError(null); setResult(null); setAnswers({}); setCurrent(0)
    submittedRef.current = false
    try {
      setSession(await startQuiz(quizId))
    } catch (e) {
      setSession(null)
      setError(e instanceof Error ? e.message : 'Could not start the quiz')
    } finally {
      setLoading(false)
    }
  }, [quizId])

  useEffect(() => { void begin() }, [begin])

  const doSubmit = useCallback(async () => {
    if (!session || submittedRef.current) return
    submittedRef.current = true
    setSubmitting(true); setError(null)
    try {
      const res = await submitQuiz(session.attempt_id, answers)
      setResult(res)
      setConfirming(false)
      void d.refresh()
    } catch (e) {
      submittedRef.current = false
      setError(e instanceof Error ? e.message : 'Could not submit your answers')
    } finally {
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, answers])

  // Countdown (only when the quiz has a time limit). The server enforces the limit too.
  useEffect(() => {
    if (!session || result || !session.time_limit_minutes) { setRemainingMs(null); return }
    const deadline = new Date(session.started_at).getTime() + session.time_limit_minutes * 60_000
    const tick = () => {
      const left = deadline - Date.now()
      setRemainingMs(left)
      if (left <= 0) void doSubmit()
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [session, result, doSubmit])

  const backTo = mod ? `/course/module/${mod.id}` : '/quizzes'
  const title = quizMeta?.title ?? 'Quiz'

  if (loading) return <Spinner label="Preparing your quiz…" />

  if (!session && error) {
    return (
      <>
        <Link to={backTo} className="mb-3 inline-flex items-center gap-1 text-sm text-indigo-700 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back
        </Link>
        <PageHeader title={title} />
        <ErrorBox message={error} />
      </>
    )
  }
  if (!session) return null

  // ---------------------------------------------------------------- results
  if (result) {
    const delta = result.previous_percent === null ? null : Number(result.percent) - Number(result.previous_percent)
    return (
      <>
        <PageHeader title={`${title}: results`} />
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-4xl font-bold text-slate-900">{Number(result.percent)}%</div>
              <div className="mt-1 text-sm text-slate-600">{result.score} of {result.total} correct · pass mark {result.pass_percent}%</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {result.passed ? <Badge tone="success">Passed</Badge> : <Badge tone="danger">Not passed</Badge>}
              {result.timed_out && <Badge tone="warning">Submitted after time limit</Badge>}
              {delta !== null && (
                <span className={`inline-flex items-center gap-1 text-sm ${delta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {delta >= 0 ? <TrendingUp className="h-4 w-4" aria-hidden /> : <TrendingDown className="h-4 w-4" aria-hidden />}
                  {delta >= 0 ? '+' : ''}{delta.toFixed(1)} points vs. your previous attempt
                </span>
              )}
              {delta === null && <span className="text-sm text-slate-500">First attempt saved to your account</span>}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className={btnPrimary} onClick={() => { void begin() }}>Retake quiz</button>
            <Link to={backTo} className={btnSecondary}>Back to module</Link>
            <Link to="/progress" className={btnSecondary}>View my progress</Link>
          </div>
        </Card>

        <h2 className="mb-3 mt-8 text-lg font-semibold text-slate-900">Review</h2>
        <ol className="space-y-4">
          {result.results.map((r, n) => (
            <li key={r.question_id}>
              <Card>
                <div className="flex items-start gap-3">
                  {r.is_correct
                    ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-label="Correct" />
                    : <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-label="Incorrect" />}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-900">{n + 1}. {r.prompt}</div>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {r.options.map((opt, i) => {
                        const isCorrect = i === r.correct_index
                        const isSelected = i === r.selected_index
                        const cls = isCorrect
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : isSelected ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-200 text-slate-700'
                        return (
                          <li key={i} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${cls}`}>
                            <span>{opt}</span>
                            <span className="shrink-0 text-xs font-medium">
                              {isCorrect && 'Correct answer'}{isSelected && !isCorrect && 'Your answer'}{isSelected && isCorrect && ' · your answer'}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                    {r.selected_index === null && <p className="mt-2 text-xs text-slate-500">You did not answer this question.</p>}
                    {r.explanation && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700"><strong>Explanation:</strong> {r.explanation}</p>}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </>
    )
  }

  // ---------------------------------------------------------------- taking
  const qs = session.questions
  const answeredCount = qs.filter((q) => answers[q.id] !== undefined).length
  const unanswered = qs.length - answeredCount
  const q = qs[Math.min(current, qs.length - 1)]

  const choose = (qid: string, idx: number) => setAnswers((a) => ({ ...a, [qid]: idx }))

  const optionList = (qid: string, options: string[]) => (
    <fieldset className="mt-3 space-y-2">
      <legend className="sr-only">Answer options</legend>
      {options.map((opt, i) => {
        const checked = answers[qid] === i
        return (
          <label
            key={i}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
              checked ? 'border-indigo-500 bg-indigo-50 text-indigo-900' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <input type="radio" name={`q-${qid}`} checked={checked} onChange={() => choose(qid, i)} className="h-4 w-4 accent-indigo-600" />
            <span className="font-medium text-slate-500">{String.fromCharCode(65 + i)}.</span>
            <span>{opt}</span>
          </label>
        )
      })}
    </fieldset>
  )

  return (
    <>
      <Link to={backTo} className="mb-3 inline-flex items-center gap-1 text-sm text-indigo-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Leave quiz
      </Link>
      <PageHeader
        title={title}
        subtitle={`${quizMeta?.kind === 'mock' ? 'Mock test' : 'Practice quiz'} · pass mark ${session.pass_percent}% · scored on the server when you submit`}
        actions={remainingMs !== null && (
          <span className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold ${remainingMs < 60_000 ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}`} role="timer">
            <Clock className="h-4 w-4" aria-hidden /> {formatClock(remainingMs)}
          </span>
        )}
      />

      {error && <div className="mb-4"><ErrorBox message={error} /></div>}

      <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Question navigation">
        {qs.map((x, n) => {
          const answered = answers[x.id] !== undefined
          const active = session.display_mode === 'single' && n === current
          return (
            <button
              key={x.id}
              onClick={() => {
                if (session.display_mode === 'single') setCurrent(n)
                else document.getElementById(`q-${x.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              aria-label={`Question ${n + 1}${answered ? ', answered' : ', not answered'}`}
              aria-current={active ? 'step' : undefined}
              className={`h-9 w-9 rounded-lg border text-sm font-semibold ${
                active ? 'border-indigo-600 bg-indigo-600 text-white'
                  : answered ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : 'border-slate-300 bg-white text-slate-600'}`}
            >
              {n + 1}
            </button>
          )
        })}
        <span className="ml-2 text-sm text-slate-500">{answeredCount}/{qs.length} answered</span>
      </div>

      {session.display_mode === 'single' ? (
        <Card>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Question {current + 1} of {qs.length}</div>
          <div className="mt-1 font-medium text-slate-900">{q.prompt}</div>
          {optionList(q.id, q.options)}
          <div className="mt-5 flex justify-between">
            <button className={btnSecondary} onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Previous
            </button>
            {current < qs.length - 1
              ? <button className={btnPrimary} onClick={() => setCurrent((c) => c + 1)}>Next <ArrowRight className="h-4 w-4" aria-hidden /></button>
              : <button className={btnPrimary} onClick={() => setConfirming(true)}>Submit quiz</button>}
          </div>
        </Card>
      ) : (
        <>
          <ol className="space-y-4">
            {qs.map((x, n) => (
              <li key={x.id} id={`q-${x.id}`}>
                <Card>
                  <div className="font-medium text-slate-900">{n + 1}. {x.prompt}</div>
                  {optionList(x.id, x.options)}
                </Card>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex justify-end">
            <button className={btnPrimary} onClick={() => setConfirming(true)}>Submit quiz</button>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirming}
        title="Submit your answers?"
        confirmLabel="Submit"
        busy={submitting}
        onConfirm={() => { void doSubmit() }}
        onCancel={() => setConfirming(false)}
      >
        {unanswered > 0
          ? <>You have <strong>{unanswered}</strong> unanswered question{unanswered === 1 ? '' : 's'}. Unanswered questions score zero.</>
          : <>All {qs.length} questions are answered. You can't change your answers after submitting.</>}
      </ConfirmDialog>
    </>
  )
}
