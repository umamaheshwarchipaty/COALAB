import { supabase } from './supabase'
import type {
  AttemptRow, CompletionRow, Course, LectureFull, LectureResource, LectureLite,
  ModuleWithContent, QuizLite, StartQuizResponse, SubmitQuizResponse, ViewRow,
} from './types'

function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? 'Unexpected database error')
}

export async function fetchCourseTree(): Promise<{ course: Course | null; modules: ModuleWithContent[] }> {
  const { data: course, error } = await supabase
    .from('courses').select('*').order('created_at').limit(1).maybeSingle()
  if (error) fail(error)
  if (!course) return { course: null, modules: [] }

  const { data, error: mErr } = await supabase
    .from('modules')
    .select(`id, position, title, description,
      lectures (id, module_id, position, title, estimated_minutes, is_required),
      quizzes (id, module_id, title, kind, pass_percent, time_limit_minutes, max_attempts)`)
    .eq('course_id', (course as Course).id)
    .order('position')
  if (mErr) fail(mErr)

  type Row = Omit<ModuleWithContent, 'quiz'> & { quizzes: QuizLite[] | QuizLite | null }
  const modules = ((data ?? []) as unknown as Row[]).map((m): ModuleWithContent => {
    const quizzes = Array.isArray(m.quizzes) ? m.quizzes : m.quizzes ? [m.quizzes] : []
    return {
      id: m.id, position: m.position, title: m.title, description: m.description,
      lectures: [...(m.lectures ?? [])].sort((a: LectureLite, b: LectureLite) => a.position - b.position),
      quiz: quizzes[0] ?? null,
    }
  })
  return { course: course as Course, modules }
}

export async function fetchMyActivity(userId: string): Promise<{
  completions: CompletionRow[]; attempts: AttemptRow[]; views: ViewRow[]
}> {
  const [c, a, v] = await Promise.all([
    supabase.from('lesson_progress').select('lecture_id, completed_at').eq('user_id', userId),
    supabase.from('quiz_attempts')
      .select('id, quiz_id, submitted_at, score, total, percent, passed')
      .eq('user_id', userId).not('submitted_at', 'is', null).order('submitted_at', { ascending: false }),
    supabase.from('lecture_views').select('lecture_id, last_viewed_at')
      .eq('user_id', userId).order('last_viewed_at', { ascending: false }).limit(20),
  ])
  if (c.error) fail(c.error)
  if (a.error) fail(a.error)
  if (v.error) fail(v.error)
  return {
    completions: (c.data ?? []) as CompletionRow[],
    attempts: (a.data ?? []) as AttemptRow[],
    views: (v.data ?? []) as ViewRow[],
  }
}

export async function fetchLecture(lectureId: string): Promise<{ lecture: LectureFull; resources: LectureResource[] }> {
  const [l, r] = await Promise.all([
    supabase.from('lectures')
      .select('id, module_id, position, title, summary, estimated_minutes, objectives, content_md, is_required')
      .eq('id', lectureId).maybeSingle(),
    supabase.from('lecture_resources').select('id, title, url, kind, provider').eq('lecture_id', lectureId),
  ])
  if (l.error) fail(l.error)
  if (!l.data) throw new Error('Lecture not found')
  if (r.error) fail(r.error)
  return { lecture: l.data as LectureFull, resources: (r.data ?? []) as LectureResource[] }
}

export async function setLectureComplete(userId: string, lectureId: string, done: boolean): Promise<void> {
  if (done) {
    const { error } = await supabase.from('lesson_progress')
      .upsert({ user_id: userId, lecture_id: lectureId }, { onConflict: 'user_id,lecture_id', ignoreDuplicates: true })
    if (error) fail(error)
  } else {
    const { error } = await supabase.from('lesson_progress').delete().eq('user_id', userId).eq('lecture_id', lectureId)
    if (error) fail(error)
  }
}

export async function recordLectureView(userId: string, lectureId: string): Promise<void> {
  // Best effort: a failure here must never block reading a lecture.
  await supabase.from('lecture_views')
    .upsert({ user_id: userId, lecture_id: lectureId, last_viewed_at: new Date().toISOString() },
      { onConflict: 'user_id,lecture_id' })
}

export async function startQuiz(quizId: string): Promise<StartQuizResponse> {
  const { data, error } = await supabase.rpc('start_quiz', { p_quiz_id: quizId })
  if (error) fail(error)
  return data as StartQuizResponse
}

export async function submitQuiz(attemptId: string, answers: Record<string, number>): Promise<SubmitQuizResponse> {
  const { data, error } = await supabase.rpc('submit_quiz', { p_attempt_id: attemptId, p_answers: answers })
  if (error) fail(error)
  return data as SubmitQuizResponse
}

export async function updateFullName(userId: string, fullName: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId)
  if (error) fail(error)
}

export interface Eligibility {
  eligible: boolean
  missing_lectures: number
  modules_without_pass: number
  required_percent: number
}

// Display only: the database re-checks this whenever a certificate is issued.
export async function fetchEligibility(courseId: string): Promise<Eligibility> {
  const { data, error } = await supabase.rpc('certificate_eligibility', { p_course_id: courseId })
  if (error) fail(error)
  return data as Eligibility
}
