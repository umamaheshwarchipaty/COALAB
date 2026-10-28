import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchCourseTree, fetchMyActivity } from './api'
import { useAuth } from './AuthContext'
import type {
  AttemptRow, CompletionRow, Course, LectureLite, ModuleWithContent, ViewRow,
} from './types'

export interface ModuleStats {
  requiredTotal: number
  requiredDone: number
  allLecturesDone: boolean
  bestPercent: number | null
  latestPercent: number | null
  attemptCount: number
  passed: boolean
}

interface DataState {
  loading: boolean
  error: string | null
  course: Course | null
  modules: ModuleWithContent[]
  completedIds: Set<string>
  attempts: AttemptRow[]
  recentViews: ViewRow[]
  lectureIndex: Map<string, { lecture: LectureLite; module: ModuleWithContent }>
  orderedLectures: LectureLite[]
  stats: (module: ModuleWithContent) => ModuleStats
  totalRequired: number
  totalDone: number
  overallPercent: number
  attemptsAverage: number | null
  continueLecture: LectureLite | null
  completions: CompletionRow[]
  refresh: () => Promise<void>
}

const DataContext = createContext<DataState | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<ModuleWithContent[]>([])
  const [completions, setCompletions] = useState<CompletionRow[]>([])
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [recentViews, setRecentViews] = useState<ViewRow[]>([])

  const refresh = useCallback(async () => {
    if (!userId) return
    try {
      const [tree, activity] = await Promise.all([fetchCourseTree(), fetchMyActivity(userId)])
      setCourse(tree.course)
      setModules(tree.modules)
      setCompletions(activity.completions)
      setAttempts(activity.attempts)
      setRecentViews(activity.views)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load course data')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setCourse(null); setModules([]); setCompletions([]); setAttempts([]); setRecentViews([])
      setLoading(false)
      return
    }
    setLoading(true)
    void refresh()
  }, [userId, refresh])

  const value = useMemo<DataState>(() => {
    const completedIds = new Set(completions.map((c) => c.lecture_id))
    const orderedLectures = modules.flatMap((m) => m.lectures)
    const lectureIndex = new Map<string, { lecture: LectureLite; module: ModuleWithContent }>()
    for (const m of modules) for (const l of m.lectures) lectureIndex.set(l.id, { lecture: l, module: m })

    const stats = (m: ModuleWithContent): ModuleStats => {
      const required = m.lectures.filter((l) => l.is_required)
      const requiredDone = required.filter((l) => completedIds.has(l.id)).length
      const mine = m.quiz ? attempts.filter((a) => a.quiz_id === m.quiz!.id) : []
      const best = mine.length ? Math.max(...mine.map((a) => Number(a.percent))) : null
      return {
        requiredTotal: required.length,
        requiredDone,
        allLecturesDone: requiredDone === required.length,
        bestPercent: best,
        latestPercent: mine.length ? Number(mine[0].percent) : null, // attempts are newest-first
        attemptCount: mine.length,
        passed: m.quiz ? mine.some((a) => a.passed) : false,
      }
    }

    const requiredLectures = orderedLectures.filter((l) => l.is_required)
    const totalRequired = requiredLectures.length
    const totalDone = requiredLectures.filter((l) => completedIds.has(l.id)).length
    const overallPercent = totalRequired === 0 ? 0 : Math.round((100 * totalDone) / totalRequired)
    const attemptsAverage = attempts.length
      ? Math.round(attempts.reduce((s, a) => s + Number(a.percent), 0) / attempts.length)
      : null

    // Continue learning: the most recently opened lecture that is still unfinished,
    // otherwise the first unfinished lecture in course order.
    let continueLecture: LectureLite | null = null
    for (const v of recentViews) {
      const entry = lectureIndex.get(v.lecture_id)
      if (entry && !completedIds.has(entry.lecture.id)) { continueLecture = entry.lecture; break }
    }
    if (!continueLecture) continueLecture = orderedLectures.find((l) => !completedIds.has(l.id)) ?? null

    return {
      loading, error, course, modules, completedIds, attempts, recentViews, lectureIndex,
      orderedLectures, stats, totalRequired, totalDone, overallPercent, attemptsAverage,
      continueLecture, completions, refresh,
    }
  }, [loading, error, course, modules, completions, attempts, recentViews, refresh])

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataState {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside DataProvider')
  return ctx
}
