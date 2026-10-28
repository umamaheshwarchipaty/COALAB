# COA Interactive Learning Lab

A React + TypeScript + Vite app on Supabase (Postgres, Auth, Row Level Security) for Computer Organization and Architecture students.

## Status

| Area | State |
|---|---|
| Auth (register, login, logout, password reset, persistent session) | Built |
| Sidebar / mobile drawer, Dashboard, My Progress, Profile | Built |
| Course → Module → Lecture, mark complete, previous/next | Built |
| Module-end quiz with server-side grading, retakes, improvement | Built |
| Database schema, RLS, grading / eligibility / certificate functions | Built and tested locally on PostgreSQL 16 |
| Exam Preparation (PYQ), Virtual Lab pages | Tables exist; **UI not built yet** |
| Certificate PDF + public verification page | Database functions exist; **UI not built yet** |
| Admin content manager UI | Not built (admins can edit via the Supabase table editor meanwhile) |

**Verification note:** the SQL was executed and its security behaviour tested on a local PostgreSQL 16. The React code passed a strict TypeScript check against hand-written type stubs, but `npm install`, `npm run build` and a browser run have not been done yet. Run `npm install && npm run build` first and fix anything it reports.


Lecture notes are written for Module 1 only. Modules 2 to 8 have the correct lecture titles and a placeholder, ready to be filled in. Only Module 1 has a quiz.

## Setup

1. **Create a Supabase project** at supabase.com.
2. **Run the SQL.** In the Supabase SQL editor run, in order:
   1. `supabase/migrations/001_schema.sql`
   2. `supabase/seed.sql`

   Both are safe to re-run.
3. **Configure environment variables.** Copy `.env.example` to `.env` and fill in the *Project URL* and *anon public key* (Project Settings → API). Never put the `service_role` key in this app.
4. **Auth settings** (Authentication → URL Configuration): set the Site URL to your deployed URL (and add `http://localhost:5173` for development) so password-reset links work. Decide whether email confirmation is required.
5. **Install and run:**
   ```
   npm install
   npm run dev
   ```
6. **Typecheck and build:** `npm run build`

## Making yourself an administrator

Admin status can only be granted from the database, never from the app. After registering, run in the SQL editor:

```sql
update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
```

## Certificate issuer

`issue_certificate()` refuses to issue until an issuing organization is configured. Set it truthfully; do not name a university or accreditor unless you are authorized to:

```sql
update public.courses set issuer_name = 'Your organization name' where slug = 'coa';
```

## Security model

- All student-owned tables (`lesson_progress`, `lecture_views`, `resource_progress`) are RLS-restricted to `auth.uid()`.
- **Answer keys** live in `quiz_answer_keys`, readable only by admins. Students receive questions via `start_quiz()`, which never returns the key.
- **Grading** happens in `submit_quiz()` (SECURITY DEFINER). The client sends only selected option indexes; it cannot submit a score. `quiz_attempts`, `quiz_responses` and `certificates` have no insert/update policies, so they can only be written by these functions.
- `start_quiz()` enforces that all required lectures in the module are complete, the attempt limit, and the time limit.
- **Roles:** students can update only `profiles.full_name` (column-level grant), so they cannot promote themselves.
- **Certificates** are issued by `issue_certificate()` after re-checking eligibility in the database. `verify_certificate(code)` is callable without signing in and returns only name, course, issuer and date.

## Deploying to Vercel

1. Push the project to a Git repository and import it in Vercel (framework: Vite).
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables.
3. `vercel.json` already rewrites all routes to `index.html` for client-side routing.

## Content integrity

Quiz questions in the seed are original practice questions and are labelled as practice. The PYQ table has an `is_verified` flag, and nothing should be marked verified or official unless you have confirmed the source and have permission to link it.
