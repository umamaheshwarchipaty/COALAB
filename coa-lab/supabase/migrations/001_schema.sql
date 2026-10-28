-- COA Interactive Learning Lab: schema, RLS, secure functions.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles & roles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Students may only change full_name. Role can never be changed from the client.
revoke update on public.profiles from authenticated, anon;
grant update (full_name) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Course content
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  issuer_name text not null default '',            -- shown on certificates (admin-configured)
  certificate_pass_percent int not null default 70 check (certificate_pass_percent between 1 and 100),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position int not null check (position > 0),
  title text not null,
  description text not null default '',
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);
create index if not exists modules_course_idx on public.modules(course_id, position);

create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  position int not null check (position > 0),       -- displayed as L1, L2, ...
  title text not null,
  summary text not null default '',
  estimated_minutes int not null default 15 check (estimated_minutes > 0),
  objectives text[] not null default '{}',
  content_md text not null default '',              -- theory notes, examples, formulas (Markdown-ish)
  is_required boolean not null default true,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, position)
);
create index if not exists lectures_module_idx on public.lectures(module_id, position);

create table if not exists public.lecture_resources (
  id uuid primary key default gen_random_uuid(),
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  title text not null,
  url text not null check (url ~* '^https?://'),
  kind text not null default 'link' check (kind in ('video', 'article', 'link')),
  provider text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists lecture_resources_lecture_idx on public.lecture_resources(lecture_id);

-- ---------------------------------------------------------------------------
-- Progress
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lecture_id)
);
create index if not exists lesson_progress_user_idx on public.lesson_progress(user_id, completed_at desc);

-- Last lecture a student opened (used for "Continue Learning" and "Recently studied").
create table if not exists public.lecture_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  lecture_id uuid not null references public.lectures(id) on delete cascade,
  last_viewed_at timestamptz not null default now(),
  primary key (user_id, lecture_id)
);
create index if not exists lecture_views_user_idx on public.lecture_views(user_id, last_viewed_at desc);

-- ---------------------------------------------------------------------------
-- Quizzes (answer keys live in a separate, admin-only table)
-- ---------------------------------------------------------------------------
create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  kind text not null default 'practice' check (kind in ('practice', 'mock')),  -- never 'official'
  pass_percent int not null default 70 check (pass_percent between 1 and 100),
  questions_per_attempt int check (questions_per_attempt is null or questions_per_attempt > 0),
  time_limit_minutes int check (time_limit_minutes is null or time_limit_minutes > 0),
  max_attempts int check (max_attempts is null or max_attempts > 0),           -- null = unlimited
  display_mode text not null default 'single' check (display_mode in ('single', 'list')),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id)
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  position int not null check (position > 0),
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  created_at timestamptz not null default now(),
  unique (quiz_id, position)
);
create index if not exists quiz_questions_quiz_idx on public.quiz_questions(quiz_id, position);

create table if not exists public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions(id) on delete cascade,
  correct_index int not null check (correct_index between 0 and 3),
  explanation text not null default ''
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_ids uuid[] not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  timed_out boolean not null default false,
  score int,
  total int,
  percent numeric(5,2),
  passed boolean
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts(user_id, quiz_id, started_at desc);

create table if not exists public.quiz_responses (
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_index int check (selected_index between 0 and 3),   -- null = unanswered
  is_correct boolean not null,
  primary key (attempt_id, question_id)
);

-- ---------------------------------------------------------------------------
-- Exam preparation, virtual lab
-- ---------------------------------------------------------------------------
create table if not exists public.pyq_resources (
  id uuid primary key default gen_random_uuid(),
  exam_name text not null,                    -- university / exam body
  exam_type text not null default 'university',
  module_id uuid references public.modules(id) on delete set null,
  topic text not null default '',
  exam_year int check (exam_year is null or exam_year between 1990 and 2100),
  title text not null,
  resource_type text not null check (resource_type in ('pdf', 'webpage', 'online_test')),
  url text not null check (url ~* '^https?://'),
  answer_key_url text check (answer_key_url is null or answer_key_url ~* '^https?://'),
  is_verified boolean not null default false,
  notes text not null default '',
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists pyq_year_idx on public.pyq_resources(exam_year desc);

create table if not exists public.virtual_lab_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  topic text not null default '',
  module_id uuid references public.modules(id) on delete set null,
  lecture_id uuid references public.lectures(id) on delete set null,
  provider text not null default '',
  url text not null check (url ~* '^https?://'),
  resource_type text not null check (resource_type in ('video', 'simulation', 'animation', 'interactive')),
  estimated_minutes int check (estimated_minutes is null or estimated_minutes > 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.resource_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_id uuid not null references public.virtual_lab_resources(id) on delete cascade,
  status text not null default 'viewed' check (status in ('viewed', 'completed')),
  updated_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

-- ---------------------------------------------------------------------------
-- Certificates (rows are created only by issue_certificate())
-- ---------------------------------------------------------------------------
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_code text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  holder_name text not null,
  course_title text not null,
  issuer_name text not null,
  issued_at timestamptz not null default now(),
  unique (user_id, course_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lectures enable row level security;
alter table public.lecture_resources enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lecture_views enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_responses enable row level security;
alter table public.pyq_resources enable row level security;
alter table public.virtual_lab_resources enable row level security;
alter table public.resource_progress enable row level security;
alter table public.certificates enable row level security;

-- Published content: readable by any signed-in user, writable by admins only.
do $$
declare t text;
begin
  foreach t in array array['courses','modules','lectures','quizzes','pyq_resources','virtual_lab_resources']
  loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s', t);
    execute format('create policy "%1$s_read" on public.%1$s for select to authenticated using (is_published or public.is_admin())', t);
    execute format('drop policy if exists "%1$s_admin_write" on public.%1$s', t);
    execute format('create policy "%1$s_admin_write" on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

drop policy if exists "lecture_resources_read" on public.lecture_resources;
create policy "lecture_resources_read" on public.lecture_resources
  for select to authenticated using (true);
drop policy if exists "lecture_resources_admin_write" on public.lecture_resources;
create policy "lecture_resources_admin_write" on public.lecture_resources
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Question text is readable (no answers); answer keys are admin-only.
drop policy if exists "quiz_questions_read" on public.quiz_questions;
create policy "quiz_questions_read" on public.quiz_questions
  for select to authenticated using (true);
drop policy if exists "quiz_questions_admin_write" on public.quiz_questions;
create policy "quiz_questions_admin_write" on public.quiz_questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "quiz_answer_keys_admin_only" on public.quiz_answer_keys;
create policy "quiz_answer_keys_admin_only" on public.quiz_answer_keys
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Student-owned rows.
drop policy if exists "lesson_progress_select_own" on public.lesson_progress;
create policy "lesson_progress_select_own" on public.lesson_progress
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "lesson_progress_insert_own" on public.lesson_progress;
create policy "lesson_progress_insert_own" on public.lesson_progress
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "lesson_progress_delete_own" on public.lesson_progress;
create policy "lesson_progress_delete_own" on public.lesson_progress
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists "lecture_views_own" on public.lecture_views;
create policy "lecture_views_own" on public.lecture_views
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "resource_progress_own" on public.resource_progress;
create policy "resource_progress_own" on public.resource_progress
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Attempts/responses/certificates: read own only. Writes happen only inside
-- SECURITY DEFINER functions below (no insert/update policies exist).
drop policy if exists "quiz_attempts_select_own" on public.quiz_attempts;
create policy "quiz_attempts_select_own" on public.quiz_attempts
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "quiz_responses_select_own" on public.quiz_responses;
create policy "quiz_responses_select_own" on public.quiz_responses
  for select to authenticated using (
    exists (select 1 from public.quiz_attempts a where a.id = attempt_id and (a.user_id = auth.uid() or public.is_admin()))
  );

drop policy if exists "certificates_select_own" on public.certificates;
create policy "certificates_select_own" on public.certificates
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Secure functions
-- ---------------------------------------------------------------------------

-- Starts (or resumes) an attempt. Enforces: published quiz, all required lectures
-- of the module completed, max_attempts. Returns the attempt plus questions
-- WITHOUT answer keys.
create or replace function public.start_quiz(p_quiz_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_quiz public.quizzes%rowtype;
  v_attempt public.quiz_attempts%rowtype;
  v_missing int;
  v_used int;
  v_ids uuid[];
begin
  if v_user is null then raise exception 'Not signed in' using errcode = '28000'; end if;

  select * into v_quiz from public.quizzes where id = p_quiz_id and is_published;
  if not found then raise exception 'Quiz not found'; end if;

  select count(*) into v_missing
  from public.lectures l
  where l.module_id = v_quiz.module_id and l.is_required and l.is_published
    and not exists (select 1 from public.lesson_progress lp where lp.lecture_id = l.id and lp.user_id = v_user);
  if v_missing > 0 then
    raise exception 'Complete all % remaining required lecture(s) in this module before taking the quiz.', v_missing;
  end if;

  -- Resume an unsubmitted attempt that is still inside its time limit.
  select * into v_attempt from public.quiz_attempts
  where user_id = v_user and quiz_id = p_quiz_id and submitted_at is null
    and (v_quiz.time_limit_minutes is null
         or now() <= started_at + make_interval(mins => v_quiz.time_limit_minutes))
  order by started_at desc limit 1;

  if not found then
    select count(*) into v_used from public.quiz_attempts
    where user_id = v_user and quiz_id = p_quiz_id and submitted_at is not null;
    if v_quiz.max_attempts is not null and v_used >= v_quiz.max_attempts then
      raise exception 'You have used all % attempts for this quiz.', v_quiz.max_attempts;
    end if;

    select coalesce(array_agg(id), '{}') into v_ids from (
      select id from public.quiz_questions where quiz_id = p_quiz_id
      order by random()
      limit coalesce(v_quiz.questions_per_attempt, 1000)
    ) q;
    if coalesce(array_length(v_ids, 1), 0) = 0 then
      raise exception 'This quiz has no questions yet.';
    end if;

    insert into public.quiz_attempts (user_id, quiz_id, question_ids)
    values (v_user, p_quiz_id, v_ids)
    returning * into v_attempt;
  end if;

  -- Abandoned, expired attempts are closed so they do not block new ones.
  update public.quiz_attempts
     set submitted_at = now(), timed_out = true, score = 0,
         total = coalesce(array_length(question_ids, 1), 0), percent = 0, passed = false
   where user_id = v_user and quiz_id = p_quiz_id and submitted_at is null and id <> v_attempt.id;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'started_at', v_attempt.started_at,
    'time_limit_minutes', v_quiz.time_limit_minutes,
    'display_mode', v_quiz.display_mode,
    'pass_percent', v_quiz.pass_percent,
    'questions', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'id', q.id, 'prompt', q.prompt, 'options', q.options) order by q.position), '[]'::jsonb)
      from public.quiz_questions q where q.id = any (v_attempt.question_ids)
    )
  );
end;
$$;

-- Grades on the server. p_answers: {"<question_id>": <selected_index 0..3>, ...}
create or replace function public.submit_quiz(p_attempt_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_att public.quiz_attempts%rowtype;
  v_quiz public.quizzes%rowtype;
  v_total int;
  v_score int := 0;
  v_pct numeric(5,2);
  v_passed boolean;
  v_timed_out boolean := false;
  v_prev numeric(5,2);
  r record;
  v_sel int;
  v_ok boolean;
  v_results jsonb := '[]'::jsonb;
begin
  if v_user is null then raise exception 'Not signed in' using errcode = '28000'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answers must be a JSON object';
  end if;

  select * into v_att from public.quiz_attempts where id = p_attempt_id and user_id = v_user for update;
  if not found then raise exception 'Attempt not found'; end if;
  if v_att.submitted_at is not null then raise exception 'This attempt was already submitted'; end if;

  select * into v_quiz from public.quizzes where id = v_att.quiz_id;
  if v_quiz.time_limit_minutes is not null
     and now() > v_att.started_at + make_interval(mins => v_quiz.time_limit_minutes) + interval '30 seconds' then
    v_timed_out := true;   -- late submissions are graded as zero
  end if;

  v_total := coalesce(array_length(v_att.question_ids, 1), 0);

  for r in
    select q.id as qid, q.prompt, q.options, q.position, k.correct_index, k.explanation
    from public.quiz_questions q
    join public.quiz_answer_keys k on k.question_id = q.id
    where q.id = any (v_att.question_ids)
    order by q.position
  loop
    v_sel := null;
    if not v_timed_out and (p_answers ->> r.qid::text) ~ '^[0-3]$' then
      v_sel := (p_answers ->> r.qid::text)::int;
    end if;
    v_ok := v_sel is not null and v_sel = r.correct_index;
    if v_ok then v_score := v_score + 1; end if;

    insert into public.quiz_responses (attempt_id, question_id, selected_index, is_correct)
    values (p_attempt_id, r.qid, v_sel, v_ok);

    v_results := v_results || jsonb_build_object(
      'question_id', r.qid, 'prompt', r.prompt, 'options', r.options,
      'selected_index', v_sel, 'correct_index', r.correct_index,
      'is_correct', v_ok, 'explanation', r.explanation);
  end loop;

  v_pct := case when v_total = 0 then 0 else round(100.0 * v_score / v_total, 2) end;
  v_passed := v_pct >= v_quiz.pass_percent;

  select percent into v_prev from public.quiz_attempts
  where user_id = v_user and quiz_id = v_att.quiz_id and submitted_at is not null
  order by submitted_at desc limit 1;

  update public.quiz_attempts
     set submitted_at = now(), timed_out = v_timed_out,
         score = v_score, total = v_total, percent = v_pct, passed = v_passed
   where id = p_attempt_id;

  return jsonb_build_object(
    'attempt_id', p_attempt_id, 'score', v_score, 'total', v_total, 'percent', v_pct,
    'passed', v_passed, 'pass_percent', v_quiz.pass_percent, 'timed_out', v_timed_out,
    'previous_percent', v_prev, 'results', v_results);
end;
$$;

-- Eligibility is computed here, never by the client.
create or replace function public.certificate_eligibility(p_course_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_missing_lectures int;
  v_unpassed_modules int;
  v_threshold int;
begin
  if v_user is null then raise exception 'Not signed in' using errcode = '28000'; end if;
  select certificate_pass_percent into v_threshold from public.courses where id = p_course_id;
  if v_threshold is null then raise exception 'Course not found'; end if;

  select count(*) into v_missing_lectures
  from public.lectures l join public.modules m on m.id = l.module_id
  where m.course_id = p_course_id and m.is_published and l.is_published and l.is_required
    and not exists (select 1 from public.lesson_progress lp where lp.lecture_id = l.id and lp.user_id = v_user);

  select count(*) into v_unpassed_modules
  from public.modules m join public.quizzes q on q.module_id = m.id and q.is_published
  where m.course_id = p_course_id and m.is_published
    and not exists (
      select 1 from public.quiz_attempts a
      where a.user_id = v_user and a.quiz_id = q.id and a.submitted_at is not null
        and a.percent >= greatest(q.pass_percent, v_threshold));

  return jsonb_build_object(
    'eligible', v_missing_lectures = 0 and v_unpassed_modules = 0,
    'missing_lectures', v_missing_lectures,
    'modules_without_pass', v_unpassed_modules,
    'required_percent', v_threshold);
end;
$$;

create or replace function public.issue_certificate(p_course_id uuid)
returns public.certificates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_elig jsonb;
  v_course public.courses%rowtype;
  v_name text;
  v_cert public.certificates%rowtype;
begin
  if v_user is null then raise exception 'Not signed in' using errcode = '28000'; end if;

  select * into v_cert from public.certificates where user_id = v_user and course_id = p_course_id;
  if found then return v_cert; end if;

  v_elig := public.certificate_eligibility(p_course_id);
  if not (v_elig ->> 'eligible')::boolean then
    raise exception 'Not eligible for a certificate yet';
  end if;

  select * into v_course from public.courses where id = p_course_id;
  select full_name into v_name from public.profiles where id = v_user;
  if coalesce(trim(v_name), '') = '' then
    raise exception 'Add your full name in Profile before generating a certificate';
  end if;
  if coalesce(trim(v_course.issuer_name), '') = '' then
    raise exception 'The administrator has not configured an issuing organization yet';
  end if;

  insert into public.certificates (certificate_code, user_id, course_id, holder_name, course_title, issuer_name)
  values ('COA-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 12)),
          v_user, p_course_id, v_name, v_course.title, v_course.issuer_name)
  returning * into v_cert;
  return v_cert;
end;
$$;

-- Public verification: callable without signing in; exposes only non-sensitive fields.
create or replace function public.verify_certificate(p_code text)
returns table (holder_name text, course_title text, issuer_name text, issued_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.holder_name, c.course_title, c.issuer_name, c.issued_at
  from public.certificates c where c.certificate_code = upper(trim(p_code));
$$;

revoke all on function public.start_quiz(uuid) from public, anon;
revoke all on function public.submit_quiz(uuid, jsonb) from public, anon;
revoke all on function public.certificate_eligibility(uuid) from public, anon;
revoke all on function public.issue_certificate(uuid) from public, anon;
grant execute on function public.start_quiz(uuid) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
grant execute on function public.certificate_eligibility(uuid) to authenticated;
grant execute on function public.issue_certificate(uuid) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
