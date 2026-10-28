export interface Profile {
  id: string
  full_name: string
  role: 'student' | 'admin'
}

export interface Course {
  id: string
  slug: string
  title: string
  description: string
  issuer_name: string
  certificate_pass_percent: number
}

export interface LectureLite {
  id: string
  module_id: string
  position: number
  title: string
  estimated_minutes: number
  is_required: boolean
}

export interface QuizLite {
  id: string
  module_id: string
  title: string
  kind: 'practice' | 'mock'
  pass_percent: number
  time_limit_minutes: number | null
  max_attempts: number | null
}

export interface ModuleWithContent {
  id: string
  position: number
  title: string
  description: string
  lectures: LectureLite[]
  quiz: QuizLite | null
}

export interface LectureFull extends LectureLite {
  summary: string
  objectives: string[]
  content_md: string
}

export interface LectureResource {
  id: string
  title: string
  url: string
  kind: 'video' | 'article' | 'link'
  provider: string
}

export interface AttemptRow {
  id: string
  quiz_id: string
  submitted_at: string
  score: number
  total: number
  percent: number
  passed: boolean
}

export interface ViewRow {
  lecture_id: string
  last_viewed_at: string
}

export interface CompletionRow {
  lecture_id: string
  completed_at: string
}

export interface StartQuizResponse {
  attempt_id: string
  started_at: string
  time_limit_minutes: number | null
  display_mode: 'single' | 'list'
  pass_percent: number
  questions: { id: string; prompt: string; options: string[] }[]
}

export interface QuestionResult {
  question_id: string
  prompt: string
  options: string[]
  selected_index: number | null
  correct_index: number
  is_correct: boolean
  explanation: string
}

export interface SubmitQuizResponse {
  attempt_id: string
  score: number
  total: number
  percent: number
  passed: boolean
  pass_percent: number
  timed_out: boolean
  previous_percent: number | null
  results: QuestionResult[]
}
