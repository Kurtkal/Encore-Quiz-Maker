# Quiz System

Production-ready mini LMS quiz module with:

- Encore.go REST API
- PostgreSQL via Encore
- Next.js App Router frontend
- Email/password authentication with JWT
- Admin and user role enforcement on the backend

## Project Structure

```text
backend/
  auth/                 # register, login, Encore auth handler
  quizzes/              # admin quiz CRUD and published quiz reads
  attempts/             # quiz submission and result retrieval
  internal/             # DB, security, role helpers, shared models
frontend/
  app/                  # Next.js App Router pages
  components/           # shared UI and layout
  features/             # auth, admin, quiz flows
  lib/api/              # typed API client and API types
```

## Run Backend

```bash
cd backend
export JWT_SECRET="c6bd24ea756b9a745b8f089dfd5cfb78e7e1068ad883cb32f13e9bfb31351612"
encore run
```

Encore starts the API on `http://localhost:4000` and provisions the local PostgreSQL database automatically.

## Run Frontend

```bash
cd frontend
- on windows machine you should run "Set-ExecutionPolicy -Scope CurrentUser RemoteSigned" command before using npm
npm install
NEXT_PUBLIC_API_URL="http://localhost:4000" npm run dev
```

Open `http://localhost:3000`.

## Create Test Users

Use the register page or call the API directly.

Admin:

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123","role":"admin"}'
```

User:

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123","role":"user"}'
```

Example local credentials:

- Admin: `admin@example.com` / `password123`
- User: `user@example.com` / `password123`

## Core Behavior

- Admins can create, edit, delete, publish, and unpublish quizzes.
- Users only see published quizzes.
- Users cannot see correct answers before submission.
- Admin routes and admin APIs reject non-admin users.
- User quiz APIs reject admins.
- One-attempt quizzes reject repeated submissions.
- Results show score, percentage, pass/fail, and answer review only when enabled by the quiz.
