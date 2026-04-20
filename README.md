
# journal
to gather my thoughts

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

# Frictionless Journal (MVP)
>>>>>>> 608ae1d (Build V1 frictionless journaling MVP)

Mobile-first journaling web app built with Next.js App Router, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Current MVP Scope

- Chat-like journaling UI with bottom-anchored input
- Entry submission captures:
  - Raw text
  - UTC timestamp
  - Geolocation (latitude/longitude), with graceful null fallback if denied/unavailable
- API endpoint at `POST /api/entries`
- PostgreSQL persistence via Prisma `Entry` model
- Feed of recent entries loaded from `GET /api/entries`

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

2. Create env file:

```bash
cp .env.example .env
```

3. Set `DATABASE_URL` in `.env` to your PostgreSQL instance.

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

## Prisma Model

The `Entry` model includes:

- `id` (UUID)
- `rawText` (string)
- `latitude` (nullable float)
- `longitude` (nullable float)
- `createdAt` (datetime)
- `aiMetadata` (JSONB, default empty object)

## Notes

<<<<<<< HEAD
- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
>>>>>>> 70ca90e (Initial commit from Create Next App)
=======
- Without a running PostgreSQL database, API persistence will not work yet.
- This repository is source-complete for the requested V1 MVP; infra/deployment can be added next.
>>>>>>> 608ae1d (Build V1 frictionless journaling MVP)
