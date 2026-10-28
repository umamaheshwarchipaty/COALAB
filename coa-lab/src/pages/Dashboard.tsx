import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Award, ClipboardCheck, FlaskConical, PlayCircle } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { useData } from '../lib/DataContext'
import { fetchEligibility, type Eligibility } from '../lib/api'
import { Badge, Card, EmptyState, ErrorBox, PageHeader, ProgressBar, Spinner, btnPrimary } from '../components/ui'

export function useEligibility(courseId: string | undefined, depKey: number) {
  const [elig, setElig] = useState<Eligibility | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    if (!courseId) return
    let live = true
    fetchEligibility(courseId).then((e) => { if (live) setElig(e) }).catch((e: unknown) => {
      if (live) setErr(e instanceof Error ? e.message : 'Could not check eligibility')
    })
    return () => { live = false }
  }, [courseId, depKey])
  return { elig, err }
}

export function Dashboard() {
  const { profile, session } = useAuth()
  const d = useData()
  const { elig } = useEligibility(d.course?.id, d.completions.length + d.attempts.length)

  if (d.loading) return <Spinner />
  if (d.error) return <ErrorBox message={d.error} onRetry={() => { void d.refresh() }} />
  if (!d.course) return <EmptyState title="No course published yet">An administrator needs to publish the course (see the README seed step).</EmptyState>

  const name = profile?.full_name || session?.user.email || 'there'
  const next = d.continueLecture
  const nextInfo = next ? d.lectureIndex.get(next.id) : undefined

  // Recommended activities: quizzes that are unlocked but not yet passed.
  const quizTodo = d.modules.filter((m) => {
    const s = d.stats(m)
    return m.quiz && s.allLecturesDone && !s.passed
  })

  const recent = d.recentViews
    .map((v) => ({ v, entry: d.lectureIndex.get(v.lecture_id) }))
    .filter((r): r is { v: typeof r.v; entry: NonNullable<typeof r.entry> } => Boolean(r.entry))
    .slice(0, 5)

  return (
    <>
      <PageHeader title={`Welcome, ${name}`} subtitle={d.course.title} />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-slate-600">Overall course completion</h2>
            <span className="text-3xl font-bold text-slate-900">{d.overallPercent}%</span>
          </div>
          <div className="mt-3"><ProgressBar percent={d.overallPercent} label="Overall completion" /></div>
          <p className="mt-2 text-sm text-slate-600">
            {d.totalDone} of {d.totalRequired} required lectures completed · {d.totalRequired - d.totalDone} remaining
          </p>
          <div className="mt-4">
            {next && nextInfo ? (
              <Link to={`/course/lecture/${next.id}`} className={btnPrimary}>
                <PlayCircle className="h-4 w-4" aria-hidden /> Continue learning: M{nextInfo.module.position} · L{next.position} {next.title}
              </Link>
            ) : d.totalRequired > 0 ? (
              <Badge tone="success">All lectures completed</Badge>
            ) : null}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-600">Quizzes</h2>
          <div className="mt-2 text-3xl font-bold text-slate-900">{d.attempts.length}</div>
          <div className="text-sm text-slate-600">attempts submitted</div>
          <div className="mt-3 text-sm text-slate-600">
            Average score: <strong className="text-slate-900">{d.attemptsAverage === null ? '—' : `${d.attemptsAverage}%`}</strong>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Recently studied</h2>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-500">You haven't opened a lecture yet. Start from Course Content.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map(({ v, entry }) => (
                <li key={v.lecture_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <Link to={`/course/lecture/${entry.lecture.id}`} className="font-medium text-indigo-700 hover:underline">
                    M{entry.module.position} · L{entry.lecture.position} {entry.lecture.title}
                  </Link>
                  {d.completedIds.has(entry.lecture.id) ? <Badge tone="success">Done</Badge> : <Badge>In progress</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Recommended next</h2>
          {quizTodo.length === 0 && !next ? (
            <p className="text-sm text-slate-500">Nothing pending right now.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {quizTodo.map((m) => (
                <li key={m.id}>
                  <Link to={`/quiz/${m.quiz!.id}`} className="inline-flex items-center gap-1 font-medium text-indigo-700 hover:underline">
                    Take the Module {m.position} quiz <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </li>
              ))}
              {next && nextInfo && (
                <li>
                  <Link to={`/course/lecture/${next.id}`} className="inline-flex items-center gap-1 font-medium text-indigo-700 hover:underline">
                    Study L{next.position}: {next.title} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Certificate</h2>
          {!elig ? (
            <p className="text-sm text-slate-500">Checking eligibility…</p>
          ) : elig.eligible ? (
            <Badge tone="success">Eligible: requirements met</Badge>
          ) : (
            <div className="text-sm text-slate-600">
              <Badge tone="warning">Not eligible yet</Badge>
              <p className="mt-2">
                {elig.missing_lectures} lecture(s) left · {elig.modules_without_pass} module quiz(zes) still to pass (minimum {elig.required_percent}%).
              </p>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-slate-600">Quick links</h2>
          <div className="flex flex-col gap-2 text-sm font-medium text-indigo-700">
            <Link to="/exam-prep" className="inline-flex items-center gap-2 hover:underline"><ClipboardCheck className="h-4 w-4" aria-hidden /> Previous-year questions</Link>
            <Link to="/virtual-lab" className="inline-flex items-center gap-2 hover:underline"><FlaskConical className="h-4 w-4" aria-hidden /> Virtual lab resources</Link>
            <Link to="/certificates" className="inline-flex items-center gap-2 hover:underline"><Award className="h-4 w-4" aria-hidden /> Certificates</Link>
          </div>
        </Card>
      </div>
    </>
  )
}
