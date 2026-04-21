# Frictionless Journal

Mobile-first journaling web app built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## MVP + V1.1 Scope

- Chat-like journaling UI with a bottom-anchored input
- Entry submission captures:
  - Raw text
  - UTC timestamp
  - Geolocation (latitude/longitude), with graceful `null` fallback if denied/unavailable
- API endpoints:
  - `POST /api/entries` to create an entry
  - `GET /api/entries` to load recent entries
- PostgreSQL persistence via Prisma `Entry` model
- Shared request validation (`zod`) on both client and server
- Optimistic UI for entry creation
- Basic API rate limiting for create requests
- Auth.js authentication with Google and optional email magic links
- User-owned entries (`Entry.userId`) scoped per authenticated user
- Structured error logs for entry load/save and geolocation failures
- Data quality guardrails (length cap + simple profanity/spam checks)
- Timezone-aware timestamp display in the client

## Tech Stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file and set `DATABASE_URL` to your PostgreSQL connection string.

3. Add auth environment variables:

```bash
AUTH_SECRET=replace-with-random-secret
AUTH_GOOGLE_ID=your-google-oauth-client-id
AUTH_GOOGLE_SECRET=your-google-oauth-client-secret
```

Optional email magic link setup:

```bash
EMAIL_SERVER_HOST=smtp.example.com
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=username
EMAIL_SERVER_PASSWORD=password
EMAIL_FROM=no-reply@example.com
```

4. Generate Prisma client:

```bash
npx prisma generate
```

5. Apply schema:

```bash
npx prisma db push
```

6. Run app:

```bash
npm run dev
```

Open `http://localhost:3000`.
