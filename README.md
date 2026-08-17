# EDH ELO Tracker

Next.js (App Router) project for tracking Commander / EDH games, ELO ratings, decks, and stats.

## Getting Started

Install dependencies and generate the Prisma client:

```bash
npm install
npm run prisma:generate
```

Start the dev server at [http://localhost:3000](http://localhost:3000):

```bash
npm run dev
```

> **Note**  
> Next.js 15 and Prisma 6 require Node.js 18.18 or newer. Use a tool like `nvm`, `asdf`, or Volta to pin to Node 20 if you run into local build failures.

## Authentication Setup

Google OAuth powers sign-in via [NextAuth.js](https://next-auth.js.org/) (App Router integration). Before running the app configure a Google Cloud OAuth client and set these environment variables in `.env`:

```bash
NEXTAUTH_SECRET= # `openssl rand -base64 32` (or AUTH_SECRET)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DATABASE_URL=postgres://...
GOOGLE_SHEETS_CREDENTIALS= # service account JSON, for the spreadsheet import
SPREADSHEET_ID=           # the spreadsheet games are recorded in
CRON_SECRET=              # `openssl rand -hex 32`, for the scheduled import
```

After setting the variables:

1. Install the auth dependencies:
   ```bash
   npm install next-auth @next-auth/prisma-adapter
   ```
2. Apply the new Prisma models:
   ```bash
   npx prisma migrate dev
   ```
3. Regenerate the Prisma client:
   ```bash
   npm run prisma:generate
   ```
4. Restart the dev server so Next.js picks up the auth configuration.

Newly authenticated users are stored in the `User` table and can be associated with existing `Player` rows through the optional `userId` field.

## Database

The project uses PostgreSQL (see `docker-compose.yml` for local development). Seed data and helper scripts live in `app/api`.

## Importing games from the spreadsheet

Games are recorded in a Google Sheet the app reads but does not own. `GET /api/sync/sheet` brings the database up to date with it, and `vercel.json` schedules that daily. Vercel authenticates the request with `CRON_SECRET` as a bearer token; requests without it are rejected.

The import is safe to run repeatedly. Games already stored are recognised by date, participants, winners and description, so a run that fails partway is corrected by the next one. Admins can also trigger it on demand from `/debug`, which posts to `/api/seed`.

ELO is a running total, so if the spreadsheet gains a row for a game played *before* something already stored, ratings for every later game are stale. The import detects this and replays the whole history rather than scoring the new game as though it were the most recent.

## Additional Scripts

- `npm test` / `npm run test:watch` - run the unit tests.
- `npm run db:up` / `db:down` - start/stop the local Postgres container.
- `npm run db:reset` - reset the database schema.
- `npm run prisma:studio` - inspect and edit data with Prisma Studio.

## Deployment

The app targets Vercel, but any Next.js hosting platform with Node.js 18+ and Postgres support will work. Ensure production deployments set the same environment variables described above.
