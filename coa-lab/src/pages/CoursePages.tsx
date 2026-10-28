import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Clock, ExternalLink, Lock, PlayCircle } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { useData } from '../lib/DataContext'
import { fetchLecture, recordLectureView, setLectureComplete } from '../lib/api'
import type { LectureFull, LectureResource } from '../lib/types'
import { Markdown } from '../components/Markdown'
import {
  Badge, Card, EmptyState, ErrorBox, PageHeader, ProgressBar, Spinner, btnPrimary, btnSecondary,
} from '../components/ui'

export function CourseContent() {
  const d = useData()
  if (d.loading) return <Spinner />
  if (d.error) return <ErrorBox message={d.error} onRetry={() => { void d.refresh() }} />
  if (!d.course) return <EmptyState title="No course published yet" />

  return (
    <>
      <PageHeader title="Course Content" subtitle={d.course.description} />
      <ul className="grid gap-4 md:grid-cols-2">
        {d.modules.map((m) => {
          const s = d.stats(m)
          const pct = s.requiredTotal === 0 ? 0 : Math.round((100 * s.requiredDone) / s.requiredTotal)
          return (
            <li key={m.id}>
              <Link to={`/course/module/${m.id}`} className="block h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Module {m.position}</div>
                  {s.passed ? <Badge tone="success">Quiz passed</Badge> : s.requiredDone === s.requiredTotal && s.requiredTotal > 0 ? <Badge tone="info">Quiz ready</Badge> : null}
                </div>
                <h2 className="mt-1 font-semibold text-slate-900">{m.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{m.description}</p>
                <div className="mt-4"><ProgressBar percent={pct} label={`Module ${m.position} progress`} /></div>
                <div className="mt-1 text-xs text-slate-500">{s.requiredDone}/{s.requiredTotal} lectures · {m.lectures.length} total</div>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}

export function ModulePage() {
  const { moduleId } = useParams()
  const d = useData()
  if (d.loading) return <Spinner />
  const m = d.modules.find((x) => x.id === moduleId)
  if (!m) return <EmptyState title="Module not found"><Link className="text-indigo-700 underline" to="/course">Back to Course Content</Link></EmptyState>
  const s = d.stats(m)

  return (
    <>
      <Link to="/course" className="mb-3 inline-flex items-center gap-1 text-sm text-indigo-700 hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All modules
      </Link>
      <PageHeader title={`Module ${m.position}: ${m.title}`} subtitle={m.description} />

      <Card className="mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">{s.requiredDone} of {s.requiredTotal} required lectures completed</span>
        </div>
        <div className="mt-2"><ProgressBar percent={s.requiredTotal ? (100 * s.requiredDone) / s.requiredTotal : 0} /></div>
      </Card>

      <ol className="space-y-2">
        {m.lectures.map((l) => {
          const done = d.completedIds.has(l.id)
          return (
            <li key={l.id}>
              <Link to={`/course/lecture/${l.id}`} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300">
                {done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Completed" /> : <Circle className="h-5 w-5 shrink-0 text-slate-300" aria-label="Not completed" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900"><span className="text-indigo-600">L{l.position}</span> · {l.title}</div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" aria-hidden /> {l.estimated_minutes} min</span>
              </Link>
            </li>
          )
        })}
      </ol>

      <Card className="mt-6">
        <h2 className="font-semibold text-slate-900">Module-end quiz</h2>
        {!m.quiz ? (
          <p className="mt-1 text-sm text-slate-500">No quiz has been set up for this module yet.</p>
        ) : (
          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <Badge tone="neutral">{m.quiz.kind === 'mock' ? 'Mock test' : 'Practice quiz'}</Badge>
              <span>Pass mark {m.quiz.pass_percent}%</span>
              {m.quiz.time_limit_minutes && <span>· {m.quiz.time_limit_minutes} min limit</span>}
              {s.bestPercent !== null && <span>· Best {s.bestPercent}% · Latest {s.latestPercent}%</span>}
              {s.passed && <Badge tone="success">Passed</Badge>}
            </div>
            {s.allLecturesDone ? (
              <Link to={`/quiz/${m.quiz.id}`} className={btnPrimary}>
                <PlayCircle className="h-4 w-4" aria-hidden /> {s.attemptCount ? 'Retake quiz' : 'Start quiz'}
              </Link>
            ) : (
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Lock className="h-4 w-4" aria-hidden /> Complete all required lectures to unlock this quiz.
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  )
}

export function LecturePage() {
  const { lectureId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const d = useData()
  const userId = session?.user.id

  const [lecture, setLecture] = useState<LectureFull | null>(null)
  const [resources, setResources] = useState<LectureResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    if (!lectureId || !userId) return
    let live = true
    setLoading(true); setError(null)
    fetchLecture(lectureId)
      .then((r) => {
        if (!live) return
        setLecture(r.lecture); setResources(r.resources)
        void recordLectureView(userId, lectureId).then(() => d.refresh())
      })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : 'Could not load lecture') })
      .finally(() => { if (live) setLoading(false) })
    window.scrollTo({ top: 0 })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lectureId, userId])

  if (loading) return <Spinner />
  if (error || !lecture) return <ErrorBox message={error ?? 'Lecture not found'} />

  const entry = d.lectureIndex.get(lecture.id)
  const mod = entry?.module
  const idx = d.orderedLectures.findIndex((l) => l.id === lecture.id)
  const prev = idx > 0 ? d.orderedLectures[idx - 1] : null
  const nextLecture = idx >= 0 && idx < d.orderedLectures.length - 1 ? d.orderedLectures[idx + 1] : null
  const isLastInModule = mod ? mod.lectures[mod.lectures.length - 1]?.id === lecture.id : false
  const done = d.completedIds.has(lecture.id)

  async function toggleComplete() {
    if (!userId || !lecture) return
    setSaving(true); setSaveError(null)
    try {
      await setLectureComplete(userId, lecture.id, !done)
      await d.refresh()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save your progress')
    } finally {
      setSaving(false)
    }
  }

  async function completeAndContinue() {
    if (!userId || !lecture) return
    setSaving(true); setSaveError(null)
    try {
      if (!done) await setLectureComplete(userId, lecture.id, true)
      await d.refresh()
      if (isLastInModule && mod?.quiz) navigate(`/course/module/${mod.id}`)
      else if (nextLecture) navigate(`/course/lecture/${nextLecture.id}`)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save your progress')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {mod && (
        <Link to={`/course/module/${mod.id}`} className="mb-3 inline-flex items-center gap-1 text-sm text-indigo-700 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Module {mod.position}: {mod.title}
        </Link>
      )}
      <PageHeader
        title={`L${lecture.position}: ${lecture.title}`}
        subtitle={lecture.summary !== lecture.title ? lecture.summary : undefined}
        actions={done ? <Badge tone="success">Completed</Badge> : undefined}
      />
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
        <Clock className="h-4 w-4" aria-hidden /> About {lecture.estimated_minutes} minutes
      </div>

      {lecture.objectives.length > 0 && (
        <Card className="mb-4">
          <h2 className="font-semibold text-slate-900">Learning objectives</h2>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-slate-700">
            {lecture.objectives.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </Card>
      )}

      <Card><Markdown source={lecture.content_md} /></Card>

      {resources.length > 0 && (
        <Card className="mt-4">
          <h2 className="font-semibold text-slate-900">Videos and resources</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {resources.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium text-indigo-700 hover:underline">
                  <ExternalLink className="h-4 w-4" aria-hidden /> {r.title}
                  {r.provider && <span className="font-normal text-slate-500">({r.provider})</span>}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {saveError && <div className="mt-4"><ErrorBox message={saveError} /></div>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          {prev && (
            <Link to={`/course/lecture/${prev.id}`} className={btnSecondary}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Previous
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <button className={btnSecondary} onClick={() => { void toggleComplete() }} disabled={saving}>
            {done ? 'Mark as not complete' : 'Mark as complete'}
          </button>
          {(nextLecture || (isLastInModule && mod?.quiz)) && (
            <button className={btnPrimary} onClick={() => { void completeAndContinue() }} disabled={saving}>
              {isLastInModule && mod?.quiz ? 'Complete & go to module quiz' : 'Complete & next'} <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </>
  )
}
