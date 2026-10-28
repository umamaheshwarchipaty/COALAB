import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PlayCircle } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { useData } from '../lib/DataContext'
import { updateFullName } from '../lib/api'
import { useEligibility } from './Dashboard'
import {
  Badge, Card, EmptyState, ErrorBox, Notice, PageHeader, ProgressBar, Spinner, btnPrimary,
} from '../components/ui'

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function QuizzesPage() {
  const d = useData()
  if (d.loading) return <Spinner />
  if (d.error) return <ErrorBox message={d.error} onRetry={() => { void d.refresh() }} />

  const withQuiz = d.modules.filter((m) => m.quiz)
  return (
    <>
      <PageHeader title="Practice Quizzes" subtitle="Module-end quizzes unlock when you finish every required lecture in the module. These are original practice questions, not past exam papers." />
      {withQuiz.length === 0 ? (
        <EmptyState title="No quizzes yet">Quizzes appear here once an administrator adds them.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {withQuiz.map((m) => {
            const s = d.stats(m)
            return (
              <li key={m.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">Module {m.position}: {m.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <Badge>{m.quiz!.kind === 'mock' ? 'Mock test' : 'Practice quiz'}</Badge>
                      <span>Pass mark {m.quiz!.pass_percent}%</span>
                      {s.attemptCount > 0 && <span>· Best {s.bestPercent}% · {s.attemptCount} attempt{s.attemptCount === 1 ? '' : 's'}</span>}
                      {s.passed && <Badge tone="success">Passed</Badge>}
                    </div>
                  </div>
                  {s.allLecturesDone
                    ? <Link to={`/quiz/${m.quiz!.id}`} className={btnPrimary}>{s.attemptCount ? 'Retake' : 'Start'}</Link>
                    : <span className="text-sm text-slate-500">Finish {s.requiredTotal - s.requiredDone} more lecture(s) to unlock</span>}
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

export function ProgressPage() {
  const d = useData()
  const { elig } = useEligibility(d.course?.id, d.completions.length + d.attempts.length)
  if (d.loading) return <Spinner />
  if (d.error) return <ErrorBox message={d.error} onRetry={() => { void d.refresh() }} />

  const quizTitle = (quizId: string) => {
    const m = d.modules.find((x) => x.quiz?.id === quizId)
    return m ? `Module ${m.position} quiz` : 'Quiz'
  }

  type Activity = { at: string; text: string }
  const activity: Activity[] = [
    ...d.completions.map((c) => {
      const e = d.lectureIndex.get(c.lecture_id)
      return { at: c.completed_at, text: e ? `Completed M${e.module.position} · L${e.lecture.position} ${e.lecture.title}` : 'Completed a lecture' }
    }),
    ...d.attempts.map((a) => ({
      at: a.submitted_at,
      text: `${quizTitle(a.quiz_id)}: ${Number(a.percent)}% (${a.score}/${a.total}) ${a.passed ? '· passed' : '· not passed'}`,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15)

  const next = d.continueLecture

  return (
    <>
      <PageHeader
        title="My Progress"
        actions={next && (
          <Link to={`/course/lecture/${next.id}`} className={btnPrimary}>
            <PlayCircle className="h-4 w-4" aria-hidden /> Continue learning
          </Link>
        )}
      />

      <Card className="mb-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-600">Overall completion</h2>
          <span className="text-2xl font-bold">{d.overallPercent}%</span>
        </div>
        <div className="mt-2"><ProgressBar percent={d.overallPercent} /></div>
        <p className="mt-2 text-sm text-slate-600">{d.totalDone} of {d.totalRequired} required lectures completed.</p>
        <div className="mt-3 text-sm">
          Certificate:{' '}
          {!elig ? <span className="text-slate-500">checking…</span>
            : elig.eligible ? <Badge tone="success">Eligible</Badge>
              : <Badge tone="warning">Not yet eligible</Badge>}
        </div>
      </Card>

      <Card className="mb-4 overflow-x-auto">
        <h2 className="mb-3 font-semibold text-slate-900">By module</h2>
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr><th className="py-2 pr-3">Module</th><th className="pr-3">Lectures</th><th className="pr-3">Best</th><th className="pr-3">Latest</th><th>Status</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {d.modules.map((m) => {
              const s = d.stats(m)
              return (
                <tr key={m.id}>
                  <td className="py-2 pr-3"><Link className="font-medium text-indigo-700 hover:underline" to={`/course/module/${m.id}`}>M{m.position}: {m.title}</Link></td>
                  <td className="pr-3">{s.requiredDone}/{s.requiredTotal}</td>
                  <td className="pr-3">{s.bestPercent === null ? '—' : `${s.bestPercent}%`}</td>
                  <td className="pr-3">{s.latestPercent === null ? '—' : `${s.latestPercent}%`}</td>
                  <td>
                    {!m.quiz ? <Badge>No quiz</Badge>
                      : s.passed ? <Badge tone="success">Passed</Badge>
                        : s.attemptCount > 0 ? <Badge tone="danger">Not passed</Badge>
                          : <Badge>Not attempted</Badge>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="overflow-x-auto">
          <h2 className="mb-3 font-semibold text-slate-900">Quiz attempt history</h2>
          {d.attempts.length === 0 ? <p className="text-sm text-slate-500">No quiz attempts yet.</p> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500"><tr><th className="py-2 pr-3">Quiz</th><th className="pr-3">Score</th><th>When</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {d.attempts.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-3">{quizTitle(a.quiz_id)}</td>
                    <td className="pr-3">{Number(a.percent)}% {a.passed ? <Badge tone="success">Pass</Badge> : <Badge tone="danger">Fail</Badge>}</td>
                    <td className="text-slate-500">{fmt(a.submitted_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-slate-900">Recent activity</h2>
          {activity.length === 0 ? <p className="text-sm text-slate-500">Nothing yet. Complete a lecture to get started.</p> : (
            <ul className="space-y-2 text-sm">
              {activity.map((a, i) => (
                <li key={i}><span className="text-slate-500">{fmt(a.at)}</span><br />{a.text}</li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

export function ProfilePage() {
  const { profile, session, refreshProfile } = useAuth()
  const [name, setName] = useState(profile?.full_name ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null); setSaved(false)
    const trimmed = name.trim()
    if (trimmed.length < 2) return setError('Please enter your full name (at least 2 characters).')
    if (!session) return
    setBusy(true)
    try {
      await updateFullName(session.user.id, trimmed)
      await refreshProfile()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Profile & Settings" subtitle="Your name appears on your certificate exactly as entered here." />
      <Card className="max-w-lg">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="text-sm text-slate-600">Email: <strong className="text-slate-900">{session?.user.email}</strong></div>
          <label className="block text-sm font-medium text-slate-700">
            Full name
            <input
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
            />
          </label>
          {error && <ErrorBox message={error} />}
          {saved && <Notice>Profile saved.</Notice>}
          <button className={btnPrimary} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </form>
      </Card>
    </>
  )
}

export function ComingSoon({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState title="Not built yet">{children}</EmptyState>
    </>
  )
}
